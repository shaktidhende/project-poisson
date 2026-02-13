let token = localStorage.getItem('emr_token') || '';
let me = null;

const loginForm = document.getElementById('login-form');
const loginMsg = document.getElementById('login-msg');
const appArea = document.getElementById('app-area');
const sessionCard = document.getElementById('session-card');
const whoami = document.getElementById('whoami');
const logoutBtn = document.getElementById('logout');

const patientsUl = document.getElementById('patients');
const apptsUl = document.getElementById('appts');
const invoicesUl = document.getElementById('invoices');
const apptPatient = document.getElementById('appt-patient');
const invoicePatient = document.getElementById('invoice-patient');

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

function esc(s='') { return String(s).replaceAll('<','&lt;'); }

async function loadAll() {
  const [patients, appts, invoices] = await Promise.all([
    api('/api/patients'), api('/api/appointments'), api('/api/invoices')
  ]);

  patientsUl.innerHTML = patients.map(p => `<li><strong>${esc(p.name)}</strong><br><span class='muted'>${esc(p.phone||'')} • ${esc(p.dob||'')}</span></li>`).join('') || '<li class="muted">No data</li>';
  apptsUl.innerHTML = appts.map(a => `<li><strong>${esc(a.patient_name)}</strong><br><span class='muted'>${new Date(a.datetime).toLocaleString()} • ${esc(a.reason||'')}</span></li>`).join('') || '<li class="muted">No data</li>';
  invoicesUl.innerHTML = invoices.map(i => `<li><strong>${esc(i.patient_name)}</strong><br><span class='muted'>₹${Number(i.amount).toFixed(2)} • ${esc(i.status)} • ${esc(i.description||'')}</span></li>`).join('') || '<li class="muted">No data</li>';

  const options = '<option value="">Select Patient</option>' + patients.map(p => `<option value='${p.id}'>${esc(p.name)}</option>`).join('');
  apptPatient.innerHTML = options;
  invoicePatient.innerHTML = options;
}

function setRoleUI() {
  const role = me?.role;
  document.getElementById('invoice-form').closest('.card').style.display = (role === 'admin' || role === 'reception') ? '' : 'none';
}

async function boot() {
  if (!token) return;
  try {
    const r = await api('/api/me');
    me = r.user;
    whoami.textContent = `Logged in as ${me.username} (${me.role})`;
    appArea.style.display = '';
    sessionCard.style.display = '';
    setRoleUI();
    await loadAll();
  } catch {
    token = '';
    localStorage.removeItem('emr_token');
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    token = data.token;
    localStorage.setItem('emr_token', token);
    me = data.user;
    loginMsg.textContent = 'Login successful';
    whoami.textContent = `Logged in as ${me.username} (${me.role})`;
    appArea.style.display = '';
    sessionCard.style.display = '';
    setRoleUI();
    await loadAll();
  } catch (err) {
    loginMsg.textContent = err.message;
  }
});

document.getElementById('patient-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('/api/patients', { method: 'POST', body: JSON.stringify(Object.fromEntries(f.entries())) });
  e.target.reset();
  await loadAll();
});

document.getElementById('appt-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patient_id: apptPatient.value,
      datetime: document.getElementById('appt-datetime').value,
      reason: document.getElementById('appt-reason').value,
    }),
  });
  e.target.reset();
  await loadAll();
});

document.getElementById('invoice-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({
      patient_id: invoicePatient.value,
      amount: document.getElementById('invoice-amount').value,
      status: document.getElementById('invoice-status').value,
      description: document.getElementById('invoice-desc').value,
    }),
  });
  e.target.reset();
  await loadAll();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('emr_token');
  location.reload();
});

boot();
