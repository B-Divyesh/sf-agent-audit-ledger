const allowed = new Set(['version', 'time', 'type', 'path', 'action', 'reason', 'command', 'exit_code', 'files', 'name', 'status', 'artifact', 'task', 'delegate']);
const actions = new Set(['added', 'modified', 'deleted', 'renamed']);
const statuses = new Set(['passed', 'failed', 'skipped', 'started', 'completed', 'cancelled']);
const testStatuses = new Set(['passed', 'failed', 'skipped']);
const delegationStatuses = new Set(['started', 'completed', 'failed', 'cancelled']);
const rfc3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/;

function nonBlank(value) { return typeof value === 'string' && /\S/.test(value); }

export function isRfc3339(value) {
  const match = rfc3339.exec(value || '');
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , , offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]
    && hour <= 23 && minute <= 59 && second <= 60
    && (!offsetHourText || (Number(offsetHourText) <= 23 && Number(offsetMinuteText) <= 59));
}

function timestampInstant(value) {
  const match = rfc3339.exec(value);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , fractionText, zone, offsetHourText, offsetMinuteText] = match;
  // Set the calendar fields independently so years 0000–0099 are not shifted by
  // Date.UTC's legacy 1900 offset. setUTCHours also correctly carries :60.
  const date = new Date(0);
  date.setUTCFullYear(Number(yearText), Number(monthText) - 1, Number(dayText));
  date.setUTCHours(Number(hourText), Number(minuteText), Number(secondText), 0);
  const offsetMinutes = zone === 'Z' ? 0 : (Number(offsetHourText) * 60 + Number(offsetMinuteText)) * (zone[0] === '+' ? 1 : -1);
  return [date.getTime() / 1000 - offsetMinutes * 60, fractionText || ''];
}

function isLaterTimestamp(candidate, current) {
  const [candidateSeconds, candidateFraction] = timestampInstant(candidate);
  const [currentSeconds, currentFraction] = timestampInstant(current);
  if (candidateSeconds !== currentSeconds) return candidateSeconds > currentSeconds;
  const width = Math.max(candidateFraction.length, currentFraction.length);
  return candidateFraction.padEnd(width, '0') > currentFraction.padEnd(width, '0');
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

function safeCommandSummary(command) {
  const tokens = command.trim().split(/\s+/);
  const first = tokens[0] || '';
  const name = first.split('/').pop();
  // Do not interpret shell syntax. A strict executable basename is useful;
  // anything else is safer to hide in full under the default privacy policy.
  if (first.includes('=') || !/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(name)) return '[command redacted]';
  return `${name}${tokens.length > 1 ? ' [arguments redacted]' : ''}`;
}

function normalizedPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function basename(value) {
  return normalizedPath(value).split('/').pop();
}

export async function buildManifest(events, selectedFiles = [], options = {}) {
  const includePaths = Boolean(options.includePaths);
  const includeArguments = Boolean(options.includeArguments);
  const fileEntries = selectedFiles.map((file) => [normalizedPath(file.webkitRelativePath || file.name), file]);
  const eventPaths = events.filter((item) => item.type === 'file').map((item) => normalizedPath(item.path));
  const selectedFile = (eventPath) => {
    const normalizedEventPath = normalizedPath(eventPath);
    const exact = fileEntries.find(([name]) => name === normalizedEventPath || name.endsWith(`/${normalizedEventPath}`));
    if (exact) return exact[1];
    const wantedBasename = basename(normalizedEventPath);
    const uniqueEventName = eventPaths.filter((path) => basename(path) === wantedBasename).length === 1;
    const basenameMatches = fileEntries.filter(([name]) => basename(name) === wantedBasename);
    return uniqueEventName && basenameMatches.length === 1 ? basenameMatches[0][1] : undefined;
  };
  const records = [];
  const refs = new Map();
  for (const event of events.filter((item) => item.type === 'file')) {
    if (refs.has(event.path)) throw new Error(`File event for “${event.path}” is duplicated.`);
    const id = randomOpaqueId('file');
    const supplied = selectedFile(event.path);
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
    if (event.type === 'command' && !includeArguments) summary = safeCommandSummary(event.command);
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
  const latestEvent = events.reduce((latest, event) => isLaterTimestamp(event.time, latest.time) ? event : latest);
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
