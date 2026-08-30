import './style.css';
import './demo-banner.css';
import sampleEvents from '../../examples/review-actions.jsonl?raw';
import { buildManifest, markdown, parseEvents } from './demo.js';
import { captureLicense, saveLicense, verifyLicense } from './license.js';

const SAMPLE_SOURCE = 'pub fn linked_evidence_count(events: usize) -> usize {\n    events\n}\n';
const DEMO_STORAGE_KEY = 'demo:agent-audit-ledger:workbench';
const isDemo = window.location.pathname.replace(/\/$/, '') === '/demo'
  || new URLSearchParams(window.location.search).has('demo');
const $ = (selector) => document.querySelector(selector);
const input = $('#events');
const fileInput = $('#files');
const preview = $('#preview');
const status = $('#demo-status');
let currentManifest;
let demoFiles = [];

function emptyPreview() {
  preview.innerHTML = '<div class="empty-mark" aria-hidden="true">○—○</div><h3>No ledger yet</h3><p>Paste events or load the sample. Your data stays in this browser.</p>';
}

function sampleFiles() {
  return [new File([SAMPLE_SOURCE], 'review.rs', { type: 'text/rust' })];
}

function saveDemoState() {
  if (!isDemo) return;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
      events: input.value,
      includePaths: $('#include-paths').checked,
      includeArguments: $('#include-arguments').checked
    }));
  } catch {
    // The sample still works when browser storage is unavailable.
  }
}

function restoreDemoState() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null'); } catch { /* Start from the bundled sample. */ }
  input.value = typeof saved?.events === 'string' ? saved.events : sampleEvents.trim();
  $('#include-paths').checked = Boolean(saved?.includePaths);
  $('#include-arguments').checked = Boolean(saved?.includeArguments);
  demoFiles = input.value === sampleEvents.trim() ? sampleFiles() : [];
}

async function buildLedger() {
  status.textContent = 'Building the local preview…';
  preview.setAttribute('aria-busy', 'true');
  try {
    const selectedFiles = demoFiles.length ? demoFiles : [...fileInput.files];
    currentManifest = await buildManifest(parseEvents(input.value), selectedFiles, {
      includePaths: $('#include-paths').checked,
      includeArguments: $('#include-arguments').checked
    });
    render(currentManifest);
    status.textContent = `Ledger ready: ${currentManifest.summary.file_count} files and ${currentManifest.summary.evidence_count} evidence events.`;
    saveDemoState();
  } catch (error) {
    currentManifest = null;
    preview.innerHTML = `<div class="error-mark" aria-hidden="true">!</div><h3>Ledger not built</h3><p>${escapeHTML(error.message)}</p>`;
    status.textContent = error.message;
  } finally {
    preview.removeAttribute('aria-busy');
  }
}

function loadSample({ build = false } = {}) {
  input.value = sampleEvents.trim();
  fileInput.value = '';
  demoFiles = isDemo ? sampleFiles() : [];
  status.textContent = build ? 'Loading the sample ledger…' : 'Sample loaded. Build the ledger when ready.';
  if (build) return buildLedger();
  input.focus();
  return Promise.resolve();
}

$('#sample').addEventListener('click', () => { void loadSample(); });
$('#clear').addEventListener('click', () => {
  input.value = '';
  fileInput.value = '';
  demoFiles = [];
  currentManifest = null;
  emptyPreview();
  status.textContent = 'Input cleared.';
  saveDemoState();
});
$('#build').addEventListener('click', () => { void buildLedger(); });
fileInput.addEventListener('change', () => { demoFiles = []; saveDemoState(); });
input.addEventListener('input', saveDemoState);
$('#include-paths').addEventListener('change', saveDemoState);
$('#include-arguments').addEventListener('change', saveDemoState);

$('#download-md').addEventListener('click', () => download('agent-audit-ledger.md', currentManifest && markdown(currentManifest), 'text/markdown'));
$('#download-json').addEventListener('click', () => download('agent-audit-ledger.json', currentManifest && JSON.stringify(currentManifest, null, 2), 'application/json'));

function render(manifest) {
  const { summary } = manifest;
  preview.innerHTML = `<div class="preview-head"><div><span class="eyebrow">Review at a glance</span><h3>${summary.file_count} changed file${summary.file_count === 1 ? '' : 's'}</h3></div><span class="stamp">Local preview</span></div>
    <dl class="metrics"><div><dt>Evidence</dt><dd>${summary.evidence_count}</dd></div><div><dt>Tests passed</dt><dd>${summary.passed_tests}</dd></div><div><dt>Failures</dt><dd>${summary.failed_tests + summary.failed_commands}</dd></div></dl>
    <ol class="file-list">${manifest.files.map((file) => `<li><div><code>${escapeHTML(file.path)}</code><span class="state">${escapeHTML(file.action)} · ${escapeHTML(file.state)}</span></div><p>${escapeHTML(file.reason)}</p><small>${file.sha256 ? `SHA-256 ${file.sha256.slice(0, 16)}…` : 'Add the matching file above to calculate its hash.'}</small></li>`).join('') || '<li>No file events were recorded.</li>'}</ol>
    <h4>Execution evidence</h4><ul class="evidence-list">${manifest.evidence.map((event) => `<li><span class="signal ${event.status === 'failed' ? 'fail' : ''}" aria-hidden="true">${event.status === 'failed' ? '×' : '✓'}</span><span><strong>${escapeHTML(event.type)} · ${escapeHTML(event.status)}</strong><code>${escapeHTML(event.summary)}</code></span></li>`).join('') || '<li>No execution evidence was recorded.</li>'}</ul>`;
}

function download(name, content, type) {
  if (!content) { status.textContent = 'Build a ledger before exporting it.'; $('#build').focus(); return; }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
  status.textContent = `${name} exported.`;
}

function escapeHTML(value = '') { const span = document.createElement('span'); span.textContent = value; return span.innerHTML; }

const offline = $('#offline');
function updateConnection() { offline.hidden = navigator.onLine; }
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
updateConnection();

const licenseNotice = $('#license-notice');
const proPanel = $('#pro-panel');
async function reconcileLicense(token) {
  const verdict = await verifyLicense(token);
  proPanel.hidden = !verdict.valid;
  if (verdict.valid) {
    try {
      const policy = JSON.parse(localStorage.getItem('aal:team-policy'));
      if (policy) { $('#policy-name').value = policy.name || ''; $('#include-paths').checked = Boolean(policy.includePaths); $('#include-arguments').checked = Boolean(policy.includeArguments); }
    } catch { /* A damaged optional preset never blocks the free ledger. */ }
  }
  licenseNotice.textContent = verdict.valid ? `Team policy kit unlocked${verdict.offline ? ' from the last verified license' : ''}.` : verdict.reason === 'offline' ? 'License verification is unavailable. The free ledger remains ready.' : token ? 'License no longer active. You can purchase or restore another license.' : 'Free ledger active. Team policy kit is optional.';
}

if (isDemo) {
  document.title = 'Demo — Agent Audit Ledger';
  document.querySelector('link[rel="canonical"]').href = 'https://agent-audit-ledger.sociobot.in/demo';
  $('#demo-banner').hidden = false;
  $('#pricing').hidden = true;
  licenseNotice.textContent = 'Demo mode does not read or save license or policy data.';
  restoreDemoState();
  $('#reset-demo').addEventListener('click', () => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    restoreDemoState();
    void buildLedger();
  });
  $('#start-real').addEventListener('click', () => localStorage.removeItem(DEMO_STORAGE_KEY));
  await buildLedger();
} else {
  const token = captureLicense();
  void reconcileLicense(token);
  $('#restore-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const value = saveLicense($('#license-token').value);
      licenseNotice.textContent = 'Checking license…';
      await reconcileLicense(value);
    } catch (error) { licenseNotice.textContent = error.message; }
  });
  $('#save-policy').addEventListener('click', () => {
    const name = $('#policy-name').value.trim();
    if (!name) { licenseNotice.textContent = 'Name the policy before saving it.'; return; }
    localStorage.setItem('aal:team-policy', JSON.stringify({ name, includePaths: $('#include-paths').checked, includeArguments: $('#include-arguments').checked }));
    licenseNotice.textContent = `Saved “${name}” on this device.`;
  });
  $('#export-policy').addEventListener('click', () => {
    const saved = localStorage.getItem('aal:team-policy');
    if (!saved) { licenseNotice.textContent = 'Save a named policy before exporting it.'; return; }
    download('aal-team-policy.json', `${JSON.stringify({ schema_version: '1', ...JSON.parse(saved) }, null, 2)}\n`, 'application/json');
  });
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* Offline enhancement only. */ }));
