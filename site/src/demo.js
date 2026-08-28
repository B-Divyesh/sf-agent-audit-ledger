const allowed = new Set(['version', 'time', 'type', 'path', 'action', 'reason', 'command', 'exit_code', 'files', 'name', 'status', 'artifact', 'task', 'delegate']);
const actions = new Set(['added', 'modified', 'deleted', 'renamed']);
const statuses = new Set(['passed', 'failed', 'skipped', 'started', 'completed', 'cancelled']);
const testStatuses = new Set(['passed', 'failed', 'skipped']);
const delegationStatuses = new Set(['started', 'completed', 'failed', 'cancelled']);

function nonBlank(value) { return typeof value === 'string' && /\S/.test(value); }

export function isRfc3339(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(value || '');
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]
    && hour <= 23 && minute <= 59 && second <= 60
    && (!offsetHourText || (Number(offsetHourText) <= 23 && Number(offsetMinuteText) <= 59));
}

export function parseEvents(text) {
  const lines = text.split(/\r?\n/).map((line, index) => [line.trim(), index + 1]).filter(([line]) => line);
  if (!lines.length) throw new Error('Add at least one JSONL event, then build the preview.');
  return lines.map(([line, number]) => {
    let event;
    try { event = JSON.parse(line); } catch { throw new Error(`Line ${number} is not valid JSON.`); }
    if (!event || Array.isArray(event) || typeof event !== 'object') throw new Error(`Line ${number} must be a JSON object.`);
    const unknown = Object.keys(event).find((key) => !allowed.has(key));
    if (unknown) throw new Error(`Line ${number} contains unknown field “${unknown}”.`);
    if (Object.values(event).some((value) => value === null)) throw new Error(`Line ${number}: event fields cannot be null.`);
    if (event.version !== '1') throw new Error(`Line ${number}: version must be “1”.`);
    if (!isRfc3339(event.time)) throw new Error(`Line ${number}: time must be RFC 3339.`);
    if (!['file', 'command', 'test', 'delegation'].includes(event.type)) throw new Error(`Line ${number}: unsupported event type.`);
    if ([event.path, event.reason, event.command, event.name, event.artifact, event.task, event.delegate].some((value) => value !== undefined && !nonBlank(value))) throw new Error(`Line ${number}: event strings cannot be blank.`);
    if (event.reason?.length > 500) throw new Error(`Line ${number}: reason must be 500 characters or fewer.`);
    if (event.action !== undefined && !actions.has(event.action)) throw new Error(`Line ${number}: action is not supported.`);
    if (event.status !== undefined && !statuses.has(event.status)) throw new Error(`Line ${number}: status is not supported.`);
    if (event.files !== undefined && (!Array.isArray(event.files) || event.files.some((value) => !nonBlank(value)) || new Set(event.files).size !== event.files.length)) throw new Error(`Line ${number}: files must be unique, non-blank paths.`);
    if (event.exit_code !== undefined && (!Number.isInteger(event.exit_code) || event.exit_code < -2147483648 || event.exit_code > 2147483647)) throw new Error(`Line ${number}: exit_code must be a 32-bit integer.`);
    if (event.type === 'file' && (!nonBlank(event.path) || !nonBlank(event.reason) || !actions.has(event.action))) throw new Error(`Line ${number}: file events need path, action, and reason.`);
    if (event.type === 'command' && (!nonBlank(event.command) || !Number.isInteger(event.exit_code))) throw new Error(`Line ${number}: command events need command and integer exit_code.`);
    if (event.type === 'test' && (!nonBlank(event.name) || !testStatuses.has(event.status))) throw new Error(`Line ${number}: test events need name and a valid status.`);
    if (event.type === 'delegation' && (!nonBlank(event.task) || !nonBlank(event.delegate) || !delegationStatuses.has(event.status))) throw new Error(`Line ${number}: delegation events need task, delegate, and status.`);
    return event;
  });
}

async function sha256(textOrBuffer) {
  const bytes = typeof textOrBuffer === 'string' ? new TextEncoder().encode(textOrBuffer) : textOrBuffer;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomOpaqueId(kind) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${kind}:${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function buildManifest(events, selectedFiles = [], options = {}) {
  const includePaths = Boolean(options.includePaths);
  const includeArguments = Boolean(options.includeArguments);
  const fileMap = new Map(selectedFiles.map((file) => [file.webkitRelativePath || file.name, file]));
  const records = [];
  const refs = new Map();
  for (const event of events.filter((item) => item.type === 'file')) {
    if (refs.has(event.path)) throw new Error(`File event for “${event.path}” is duplicated.`);
    const id = randomOpaqueId('file');
    const supplied = fileMap.get(event.path) || [...fileMap.entries()].find(([name]) => name.endsWith(`/${event.path}`))?.[1];
    const deleted = event.action === 'deleted';
    const hash = !deleted && supplied ? await sha256(await supplied.arrayBuffer()) : '';
    records.push({ id, path: includePaths ? event.path : id, action: event.action, reason: event.reason, sha256: hash, state: deleted ? 'deleted' : supplied ? 'present + hashed' : 'not supplied', evidence: [] });
    refs.set(event.path, records.length - 1);
  }
  const evidence = [];
  let evidenceNumber = 0;
  for (const event of events) {
    if (event.type === 'file') continue;
    evidenceNumber += 1;
    const fileRefs = [];
    for (const path of event.files || []) {
      const recordIndex = refs.get(path);
      if (recordIndex === undefined) throw new Error(`Evidence path “${path}” has no matching file event.`);
      fileRefs.push(records[recordIndex].id);
    }
    const id = `evidence-${String(evidenceNumber).padStart(3, '0')}`;
    let summary = event.name || event.task || event.command;
    let status = event.status || (event.exit_code === 0 ? 'passed' : 'failed');
    if (event.type === 'command' && !includeArguments) summary = `${event.command.trim().split(/\s+/)[0].split('/').pop()}${event.command.trim().includes(' ') ? ' [arguments redacted]' : ''}`;
    if (event.type === 'delegation') summary = `${event.task} — ${event.delegate}`;
    evidence.push({ id, type: event.type, time: event.time, summary, status, ...(Number.isInteger(event.exit_code) ? { exit_code: event.exit_code } : {}), files: fileRefs });
    for (const record of records) if (fileRefs.includes(record.id)) record.evidence.push(id);
  }
  const summary = {
    file_count: records.length, evidence_count: evidence.length,
    passed_tests: evidence.filter((item) => item.type === 'test' && item.status === 'passed').length,
    failed_tests: evidence.filter((item) => item.type === 'test' && item.status === 'failed').length,
    failed_commands: evidence.filter((item) => item.type === 'command' && item.status === 'failed').length,
    delegated_tasks: evidence.filter((item) => item.type === 'delegation').length,
    unlinked_events: evidence.filter((item) => !item.files.length).length
  };
  const latestEvent = events.reduce((latest, event) => Date.parse(event.time) > Date.parse(latest.time) ? event : latest);
  return { schema_version: '1', generated_at: latestEvent.time, privacy: `${includePaths ? 'paths included by explicit opt-in' : 'paths redacted with per-ledger random opaque IDs'}; ${includeArguments ? 'command arguments included by explicit opt-in' : 'command arguments redacted'}; prompts and file contents excluded`, summary, files: records, evidence };
}

export function markdown(manifest) {
  const lines = ['# Agent Audit Ledger', '', `> Generated ${manifest.generated_at} · schema v1 · ${manifest.privacy}`, '', '## Review at a glance', '', `- **${manifest.summary.file_count} files** and **${manifest.summary.evidence_count} evidence events**`, `- **Tests:** ${manifest.summary.passed_tests} passed, ${manifest.summary.failed_tests} failed`, `- **Commands:** ${manifest.summary.failed_commands} failed`, `- **Delegated tasks:** ${manifest.summary.delegated_tasks}`, '', '## Changed files', ''];
  for (const file of manifest.files) lines.push(`### \`${file.path}\` · ${file.action}`, '', file.reason, '', ...(file.sha256 ? [`- SHA-256: \`${file.sha256}\``] : []), `- State: ${file.state}`, `- Evidence: ${file.evidence.join(', ') || 'none recorded'}`, '');
  lines.push('## Execution evidence', '');
  for (const event of manifest.evidence) lines.push(`- ${['passed', 'completed'].includes(event.status) ? '✓' : event.status === 'failed' ? '✗' : '○'} **${event.type} · ${event.status}** — \`${event.summary}\`${event.files.length ? ` → ${event.files.join(', ')}` : ''}`);
  lines.push('', '## Integrity', '', 'Browser preview is unsigned. Run the aal CLI to hash repository files and create a signed manifest. Hashes establish byte identity only; they do not prove intent or correctness.', '');
  return lines.join('\n');
}
