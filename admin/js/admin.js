/* ============================================================
   SILVERNEST HOME CARE — Admin Portal JS
   Gate auth, lead loading, CSV export, settings, reminders
   ============================================================ */
'use strict';

/* ── CONFIG ──────────────────────────────────────────────────── */
const STORAGE_KEY_PIN    = 'sn_admin_pin';
const STORAGE_KEY_URL    = 'sn_script_url';
const STORAGE_KEY_AUTH   = 'sn_authed';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznGl2KJSB4LkRQQV4yYGPOvzOQ5ie4s-7fK0MO6TKOX7992QDRZYacMMaCXXIFZI0/exec';
// Default PIN hash (SHA-256 of "123456"). Change via Settings tab.
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
  ['leads', 'reminders', 'settings'].forEach(t => {
    document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== name);
  });
  document.querySelectorAll('.admin-sidebar__link').forEach(l => l.classList.remove('active'));
  el?.classList.add('active');

  const titles = {
    leads:     ['Leads',     'All client intake submissions'],
    reminders: ['Reminders', 'Schedule follow-up email alerts'],
    settings:  ['Settings',  'Configure your Apps Script connection']
  };
  document.getElementById('tab-title').textContent    = titles[name][0];
  document.getElementById('tab-subtitle').textContent = titles[name][1];

  if (name === 'reminders') loadReminders();
}

/* ── LEADS ───────────────────────────────────────────────────── */
let allLeads = [];

async function loadLeads() {
  const url     = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;
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
  leads.forEach((row, idx) => {
    const sheetRow = idx + 2; // row 1 = headers; data starts at row 2
    const [timestamp, name, , phone, email, recipient, , careNeeds, , , contactTime, , , status] = row;
    const currentStatus = status || 'New';
    const date = timestamp ? new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.title = 'Click to view full details';
    tr.innerHTML = `
      <td style="white-space:nowrap;color:var(--gray-600);font-size:var(--text-small);">${esc(date)}</td>
      <td><strong>${esc(name || '—')}</strong>${recipient ? `<br><span style="font-size:var(--text-xs);color:var(--gray-400);">For: ${esc(recipient)}</span>` : ''}</td>
      <td><a href="tel:${esc(phone)}" style="color:var(--sage-dark);font-weight:500;" onclick="event.stopPropagation()">${esc(phone || '—')}</a></td>
      <td><a href="mailto:${esc(email)}" style="color:var(--sage-dark);" onclick="event.stopPropagation()">${esc(email || '—')}</a></td>
      <td style="font-size:var(--text-small);color:var(--gray-600);">${esc(careNeeds || '—')}</td>
      <td style="font-size:var(--text-small);color:var(--gray-600);">${esc(contactTime || '—')}</td>
      <td onclick="event.stopPropagation()">
        <select class="status-select" data-row="${sheetRow}" onchange="updateStatus(this)" aria-label="Change status"
          style="padding:.35rem .6rem;border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:700;border:1.5px solid;cursor:pointer;appearance:none;-webkit-appearance:none;background:none;outline:none;">
          <option value="New"       ${currentStatus === 'New'       ? 'selected' : ''}>🟢 New</option>
          <option value="Contacted" ${currentStatus === 'Contacted' ? 'selected' : ''}>🔵 Contacted</option>
          <option value="Closed"    ${currentStatus === 'Closed'    ? 'selected' : ''}>⚫ Closed</option>
        </select>
      </td>
    `;
    tr.addEventListener('click', () => openDrawer(idx));

    // Colour the select to match status
    const sel = tr.querySelector('.status-select');
    applyStatusStyle(sel, currentStatus);

    tbody.appendChild(tr);
  });

  loading.classList.add('hidden');
  empty.classList.add('hidden');
  wrap.classList.remove('hidden');
  updateStats(leads);
}

function applyStatusStyle(sel, status) {
  const styles = {
    New:       { background: 'rgba(122,158,126,0.12)', color: 'var(--sage-dark)',  border: 'rgba(122,158,126,0.3)' },
    Contacted: { background: 'rgba(13,27,42,0.08)',    color: 'var(--navy)',       border: 'rgba(13,27,42,0.2)'   },
    Closed:    { background: 'var(--gray-200)',         color: 'var(--gray-600)',   border: 'var(--silver-light)'  },
  };
  const s = styles[status] || styles.New;
  sel.style.background   = s.background;
  sel.style.color        = s.color;
  sel.style.borderColor  = s.border;
}

/* ── STATUS UPDATE ───────────────────────────────────────────── */
async function updateStatus(selectEl) {
  const newStatus = selectEl.value;
  const sheetRow  = selectEl.dataset.row;
  const url       = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;

  selectEl.disabled = true;
  applyStatusStyle(selectEl, newStatus);

  try {
    await fetch(url, {
      method: 'POST',
      mode:   'no-cors',
      body:   new URLSearchParams({ action: 'update_status', row: sheetRow, status: newStatus })
    });
    showAdminToast(`Status updated to "${newStatus}"`, true);
    // Keep allLeads in sync so CSV export is accurate
    const idx = parseInt(sheetRow) - 2;
    if (allLeads[idx]) allLeads[idx][13] = newStatus;
    updateStats(allLeads);
  } catch {
    showAdminToast('Could not update status — check your connection.', false);
  } finally {
    selectEl.disabled = false;
  }
}

function updateStats(leads) {
  document.getElementById('stat-total').textContent     = leads.length;
  document.getElementById('stat-new').textContent       = leads.filter(r => !r[13] || r[13] === 'New').length;
  document.getElementById('stat-contacted').textContent = leads.filter(r => r[13] === 'Contacted').length;
  document.getElementById('stat-closed').textContent    = leads.filter(r => r[13] === 'Closed').length;
}

/* ── CSV EXPORT ──────────────────────────────────────────────── */
function exportCSV() {
  if (!allLeads.length) { alert('No leads to export.'); return; }
  const headers = ['Date', 'Name', 'Last Name', 'Phone', 'Email', 'Care Recipient', 'Relationship', 'Care Needs', 'Care Frequency', 'Start Timeline', 'Contact Time', 'Referral', 'Form Type', 'Status', 'Notes'];
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

/* ── REMINDERS ───────────────────────────────────────────────── */
function quickReminder(hours) {
  const dt = new Date(Date.now() + hours * 3600 * 1000);
  // datetime-local requires YYYY-MM-DDTHH:MM
  const pad = n => String(n).padStart(2, '0');
  const val = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  document.getElementById('rem-custom-time').value = val;
}

async function setReminder() {
  const name  = document.getElementById('rem-lead-name').value.trim();
  const email = document.getElementById('rem-lead-email').value.trim();
  const phone = document.getElementById('rem-lead-phone').value.trim();
  const dtVal = document.getElementById('rem-custom-time').value;
  const notes = document.getElementById('rem-notes').value.trim();

  if (!name) { showReminderResult('Please enter a lead name.', false); return; }
  if (!dtVal) { showReminderResult('Please pick a reminder time (use a quick button or the date/time picker).', false); return; }

  const dueAt  = new Date(dtVal).getTime();
  if (isNaN(dueAt) || dueAt <= Date.now()) { showReminderResult('Reminder time must be in the future.', false); return; }

  const url = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;

  showReminderResult('Saving…', null);
  try {
    await fetch(url, {
      method: 'POST',
      mode:   'no-cors',
      body:   new URLSearchParams({ action: 'set_reminder', lead_name: name, lead_email: email, lead_phone: phone, due_at: dueAt, notes })
    });
    showReminderResult(`✓ Reminder set for ${new Date(dueAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. You'll receive an email alert at that time.`, true);
    // Clear form
    ['rem-lead-name','rem-lead-email','rem-lead-phone','rem-custom-time','rem-notes'].forEach(id => { document.getElementById(id).value = ''; });
    setTimeout(loadReminders, 1200);
  } catch {
    showReminderResult('Could not save reminder — check your connection.', false);
  }
}

async function loadReminders() {
  const url      = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;
  const loading  = document.getElementById('reminders-loading');
  const empty    = document.getElementById('reminders-empty');
  const wrap     = document.getElementById('reminders-table-wrap');
  if (!loading) return;

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  wrap.classList.add('hidden');

  try {
    const res  = await fetch(`${url}?action=reminders`);
    const json = await res.json();
    const rows = (json.reminders || []).slice(1); // skip header row
    if (!rows.length) {
      loading.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    renderReminders(rows);
  } catch {
    loading.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--gray-400);">Could not load reminders.</p>';
  }
}

function renderReminders(rows) {
  const loading = document.getElementById('reminders-loading');
  const empty   = document.getElementById('reminders-empty');
  const wrap    = document.getElementById('reminders-table-wrap');
  const tbody   = document.getElementById('reminders-tbody');

  // Show only unsent reminders first, then sent, sorted by due date
  const sorted = [...rows].sort((a, b) => {
    if (a[6] !== b[6]) return a[6] ? 1 : -1; // unsent first
    return new Date(a[5]) - new Date(b[5]);
  });

  tbody.innerHTML = '';
  sorted.forEach(row => {
    const [, , name, email, phone, dueAt, sent, notes] = row;
    const due     = dueAt ? new Date(dueAt) : null;
    const isPast  = due && due <= new Date();
    const isSent  = sent === true || sent === 'TRUE' || sent === 'true';
    const dueStr  = due ? due.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${esc(name || '—')}</strong></td>
      <td style="font-size:var(--text-small);">
        ${email ? `<a href="mailto:${esc(email)}" style="color:var(--sage-dark);">${esc(email)}</a><br>` : ''}
        ${phone ? `<a href="tel:${esc(phone)}" style="color:var(--sage-dark);">${esc(phone)}</a>` : ''}
        ${!email && !phone ? '—' : ''}
      </td>
      <td style="white-space:nowrap;font-size:var(--text-small);color:${isPast && !isSent ? '#C74B4B' : 'var(--gray-600)'};">${esc(dueStr)}</td>
      <td style="font-size:var(--text-small);color:var(--gray-600);">${esc(notes || '—')}</td>
      <td>
        ${isSent
          ? '<span class="status-badge status-badge--closed">✓ Sent</span>'
          : isPast
            ? '<span class="status-badge" style="background:rgba(199,75,75,0.1);color:#C74B4B;border:none;">Overdue</span>'
            : '<span class="status-badge status-badge--new">⏳ Pending</span>'
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  loading.classList.add('hidden');
  empty.classList.add('hidden');
  wrap.classList.remove('hidden');
}

function showReminderResult(msg, success) {
  const el = document.getElementById('reminder-result');
  el.style.display    = 'block';
  el.style.color      = success === null ? 'var(--gray-600)' : success ? 'var(--sage-dark)' : '#C74B4B';
  el.style.background = success === null ? 'var(--gray-100)' : success ? 'rgba(122,158,126,0.1)' : 'rgba(199,75,75,0.08)';
  el.textContent      = msg;
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
  el.style.display      = 'block';
  el.style.color        = success === null ? 'var(--gray-600)' : success ? 'var(--sage-dark)' : '#C74B4B';
  el.style.padding      = '0.75rem 1rem';
  el.style.background   = success === null ? 'var(--gray-100)' : success ? 'rgba(122,158,126,0.1)' : 'rgba(199,75,75,0.08)';
  el.style.borderRadius = 'var(--radius-sm)';
  el.textContent        = msg;
}

/* ── ADMIN TOAST ─────────────────────────────────────────────── */
function showAdminToast(msg, success) {
  let t = document.getElementById('admin-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'admin-toast';
    t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(80px);padding:.75rem 1.5rem;border-radius:var(--radius-full);font-size:.875rem;font-weight:500;box-shadow:var(--shadow-lg);z-index:9999;transition:transform .3s ease;white-space:nowrap;';
    document.body.appendChild(t);
  }
  t.textContent        = msg;
  t.style.background   = success ? 'var(--sage)' : '#C74B4B';
  t.style.color        = '#fff';
  t.style.transform    = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; }, 3500);
}

/* ── LEAD DETAIL DRAWER ──────────────────────────────────────── */
let drawerSheetRow = null;

function openDrawer(idx) {
  const row = allLeads[idx];
  if (!row) return;
  drawerSheetRow = idx + 2;

  const [timestamp, firstName, lastName, phone, email, recipient, relationship,
         careNeeds, careFreq, timeline, contactTime, referral, formType, status, notes] = row;

  const name = [firstName, lastName].filter(Boolean).join(' ') || '—';
  const date = timestamp ? new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  document.getElementById('drawer-name').textContent = name;
  document.getElementById('drawer-date').textContent = `Submitted ${date}`;

  const setField = (id, val) => { document.getElementById(id).textContent = val || '—'; };
  setField('drawer-contact-time', contactTime);
  setField('drawer-referral',     referral);
  setField('drawer-recipient',    recipient);
  setField('drawer-relationship', relationship);
  setField('drawer-care-needs',   careNeeds);
  setField('drawer-care-freq',    careFreq);
  setField('drawer-timeline',     timeline);
  setField('drawer-form-type',    formType);

  const phoneEl = document.getElementById('drawer-phone');
  phoneEl.textContent = phone || '—';
  phoneEl.href = phone ? `tel:${phone}` : '#';

  const emailEl = document.getElementById('drawer-email');
  emailEl.textContent = email || '—';
  emailEl.href = email ? `mailto:${email}` : '#';

  document.getElementById('drawer-call-btn').href  = phone ? `tel:${phone}` : '#';
  document.getElementById('drawer-email-btn').href = email ? `mailto:${email}` : '#';

  const statusSel = document.getElementById('drawer-status');
  statusSel.value = status || 'New';
  applyStatusStyle(statusSel, status || 'New');
  statusSel.dataset.row = drawerSheetRow;

  document.getElementById('drawer-notes').value = notes || '';
  document.getElementById('drawer-note-result').style.opacity = '0';

  const drawer = document.getElementById('lead-drawer');
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const drawer = document.getElementById('lead-drawer');
  drawer.classList.remove('open');
  drawer.addEventListener('transitionend', () => { drawer.hidden = true; }, { once: true });
  document.body.style.overflow = '';
}

async function saveNote() {
  const notes    = document.getElementById('drawer-notes').value.trim();
  const url      = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL;
  const resultEl = document.getElementById('drawer-note-result');

  try {
    await fetch(url, {
      method: 'POST',
      mode:   'no-cors',
      body:   new URLSearchParams({ action: 'update_notes', row: drawerSheetRow, notes })
    });
    // Update local cache
    const idx = drawerSheetRow - 2;
    if (allLeads[idx]) allLeads[idx][14] = notes;
    resultEl.textContent    = '✓ Saved';
    resultEl.style.opacity  = '1';
    setTimeout(() => { resultEl.style.opacity = '0'; }, 2500);
  } catch {
    showAdminToast('Could not save note — check your connection.', false);
  }
}

function updateStatusFromDrawer(sel) {
  // Sync the status select in the table row as well
  updateStatus(sel);
  const idx = drawerSheetRow - 2;
  const tableSelects = document.querySelectorAll(`.status-select[data-row="${drawerSheetRow}"]`);
  tableSelects.forEach(s => { s.value = sel.value; applyStatusStyle(s, sel.value); });
}

function prefillReminder() {
  const name  = document.getElementById('drawer-name').textContent;
  const email = document.getElementById('drawer-email').textContent;
  const phone = document.getElementById('drawer-phone').textContent;
  closeDrawer();
  switchTab('reminders', document.querySelector('[data-tab="reminders"]'));
  document.getElementById('rem-lead-name').value  = name  !== '—' ? name  : '';
  document.getElementById('rem-lead-email').value = email !== '—' ? email : '';
  document.getElementById('rem-lead-phone').value = phone !== '—' ? phone : '';
}

/* ── UTILITIES ───────────────────────────────────────────────── */
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function sha256(message) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
