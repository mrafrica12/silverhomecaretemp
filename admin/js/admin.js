/* ============================================================
   SILVERNEST HOME CARE — Admin Portal JS
   Gate auth, lead loading, CSV export, settings
   ============================================================ */
'use strict';

/* ── CONFIG ──────────────────────────────────────────────────── */
const STORAGE_KEY_PIN    = 'sn_admin_pin';
const STORAGE_KEY_URL    = 'sn_script_url';
const STORAGE_KEY_AUTH   = 'sn_authed';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznGl2KJSB4LkRQQV4yYGPOvzOQ5ie4s-7fK0MO6TKOX7992QDRZYacMMaCXXIFZI0/exec';
// Default PIN hash (SHA-256 of "123456"). Change via Settings tab.
// This is a deterrent layer only — not cryptographically secure for PHI.
const DEFAULT_PIN_HASH   = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

/* ── BOOT ────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem(STORAGE_KEY_AUTH) === 'true') {
    showPortal();
  }

  const gateForm = document.getElementById('gate-form');
  gateForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin    = document.getElementById('pin').value.trim();
    const hashed = await sha256(pin);
    const stored = localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN_HASH;
    if (hashed === stored) {
      sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
      showPortal();
    } else {
      const err = document.getElementById('pin-error');
      if (err) { err.style.display = 'block'; err.textContent = 'Incorrect PIN. Please try again.'; }
      document.getElementById('pin').value = '';
    }
  });

  // Pre-fill saved script URL
  const urlInput = document.getElementById('script-url');
  if (urlInput) urlInput.value = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;
});

/* ── AUTH ────────────────────────────────────────────────────── */
function showPortal() {
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('portal').classList.remove('hidden');
  loadLeads();
}

function logout() {
  sessionStorage.removeItem(STORAGE_KEY_AUTH);
  document.getElementById('portal').classList.add('hidden');
  document.getElementById('gate').classList.remove('hidden');
  document.getElementById('pin').value = '';
}

/* ── TABS ────────────────────────────────────────────────────── */
function switchTab(name, el) {
  ['leads', 'settings'].forEach(t => {
    document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== name);
  });
  document.querySelectorAll('.admin-sidebar__link').forEach(l => l.classList.remove('active'));
  el?.classList.add('active');

  const titles = { leads: ['Leads', 'All client intake submissions'], settings: ['Settings', 'Configure your Apps Script connection'] };
  document.getElementById('tab-title').textContent    = titles[name][0];
  document.getElementById('tab-subtitle').textContent = titles[name][1];
}

/* ── LEADS ───────────────────────────────────────────────────── */
let allLeads = [];

async function loadLeads() {
  const url = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;
  const loading = document.getElementById('leads-loading');
  const empty   = document.getElementById('leads-empty');
  const wrap    = document.getElementById('leads-table-wrap');

  if (!url) {
    loading.innerHTML = `<div style="font-size:2rem;margin-bottom:.75rem;">⚙️</div><p>No Apps Script URL configured. Go to <strong>Settings</strong> to add your URL.</p>`;
    return;
  }

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  wrap.classList.add('hidden');

  try {
    const res  = await fetch(url);
    const json = await res.json();

    if (!json.leads || json.leads.length <= 1) {
      loading.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    // Row 0 is headers, skip it
    allLeads = json.leads.slice(1);
    renderLeads(allLeads);
  } catch {
    loading.innerHTML = `<div style="font-size:2rem;margin-bottom:.75rem;">❌</div><p>Could not connect to Apps Script. Check your URL in Settings and ensure the script is deployed as a Web App with access set to <em>Anyone</em>.</p>`;
  }
}

function renderLeads(leads) {
  const loading = document.getElementById('leads-loading');
  const empty   = document.getElementById('leads-empty');
  const wrap    = document.getElementById('leads-table-wrap');
  const tbody   = document.getElementById('leads-tbody');

  if (!leads.length) {
    loading.classList.add('hidden');
    empty.classList.remove('hidden');
    wrap.classList.add('hidden');
    updateStats([]);
    return;
  }

  tbody.innerHTML = '';
  leads.forEach(row => {
    const [timestamp, name, phone, email, recipient, careNeeds, contactTime, referral, status] = row;
    const statusClass = { 'New': 'new', 'Contacted': 'contacted', 'Closed': 'closed' }[status] || 'new';
    const date = timestamp ? new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="white-space:nowrap;color:var(--gray-600);font-size:var(--text-small);">${esc(date)}</td>
      <td><strong>${esc(name || '—')}</strong>${recipient ? `<br><span style="font-size:var(--text-xs);color:var(--gray-400);">For: ${esc(recipient)}</span>` : ''}</td>
      <td><a href="tel:${esc(phone)}" style="color:var(--sage-dark);font-weight:500;">${esc(phone || '—')}</a></td>
      <td><a href="mailto:${esc(email)}" style="color:var(--sage-dark);">${esc(email || '—')}</a></td>
      <td style="font-size:var(--text-small);color:var(--gray-600);">${esc(careNeeds || '—')}</td>
      <td style="font-size:var(--text-small);color:var(--gray-600);">${esc(contactTime || '—')}</td>
      <td><span class="status-badge status-badge--${statusClass}">${esc(status || 'New')}</span></td>
    `;
    tbody.appendChild(tr);
  });

  loading.classList.add('hidden');
  empty.classList.add('hidden');
  wrap.classList.remove('hidden');
  updateStats(leads);
}

function updateStats(leads) {
  document.getElementById('stat-total').textContent     = leads.length;
  document.getElementById('stat-new').textContent       = leads.filter(r => !r[8] || r[8] === 'New').length;
  document.getElementById('stat-contacted').textContent = leads.filter(r => r[8] === 'Contacted').length;
  document.getElementById('stat-closed').textContent    = leads.filter(r => r[8] === 'Closed').length;
}

/* ── CSV EXPORT ──────────────────────────────────────────────── */
function exportCSV() {
  if (!allLeads.length) { alert('No leads to export.'); return; }

  const headers = ['Date', 'Name', 'Phone', 'Email', 'Care Recipient', 'Care Needs', 'Contact Time', 'Referral', 'Status', 'Notes'];
  const rows    = [headers, ...allLeads];
  const csv     = rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob    = new Blob([csv], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `silvernest-leads-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── SETTINGS ────────────────────────────────────────────────── */
function saveScriptUrl() {
  const url = document.getElementById('script-url').value.trim();
  if (!url) { showResult('Please enter a valid URL.', false); return; }
  localStorage.setItem(STORAGE_KEY_URL, url);
  showResult('✓ URL saved. Click "Test Connection" to verify.', true);
}

async function testConnection() {
  const url = localStorage.getItem(STORAGE_KEY_URL);
  if (!url) { showResult('Save a URL first.', false); return; }
  showResult('Testing…', null);
  try {
    const res  = await fetch(url);
    const json = await res.json();
    if (json.status === 'success' || Array.isArray(json.leads)) {
      showResult(`✓ Connected successfully. ${json.leads ? `${json.leads.length - 1} lead(s) found.` : ''}`, true);
    } else {
      showResult(`⚠ Connected but received unexpected response: ${JSON.stringify(json)}`, false);
    }
  } catch (err) {
    showResult(`✗ Connection failed: ${err.message}. Check the URL and ensure the script is deployed with access set to "Anyone".`, false);
  }
}

function changePin() {
  const newPin = document.getElementById('new-pin').value.trim();
  if (newPin.length < 4) { alert('PIN must be at least 4 digits.'); return; }
  sha256(newPin).then(hash => {
    localStorage.setItem(STORAGE_KEY_PIN, hash);
    document.getElementById('new-pin').value = '';
    alert('PIN updated. Remember it — there is no recovery option from this client-side gate.');
  });
}

function showResult(msg, success) {
  const el = document.getElementById('connection-result');
  el.style.display = 'block';
  el.style.color   = success === null ? 'var(--gray-600)' : success ? 'var(--sage-dark)' : '#C74B4B';
  el.style.padding = '0.75rem 1rem';
  el.style.background = success === null ? 'var(--gray-100)' : success ? 'rgba(122,158,126,0.1)' : 'rgba(199,75,75,0.08)';
  el.style.borderRadius = 'var(--radius-sm)';
  el.textContent = msg;
}

/* ── UTILITIES ───────────────────────────────────────────────── */
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function sha256(message) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
