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
const plansUl = document.getElementById('plans');
const rxUl = document.getElementById('rx');
const notesUl = document.getElementById('notes');

const selects = {
  appt: document.getElementById('appt-patient'),
  invoice: document.getElementById('invoice-patient'),
  plan: document.getElementById('plan-patient'),
  rx: document.getElementById('rx-patient'),
  note: document.getElementById('note-patient'),
};

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

function esc(s = '') { return String(s).replaceAll('<', '&lt;'); }

function patientOptions(patients) {
  return '<option value="">Select Patient</option>' + patients.map(p => `<option value='${p.id}'>${esc(p.name)}</option>`).join('');
}

function roleGate() {
  const role = me?.role;
  const canBilling = role === 'admin' || role === 'reception';
  const canDoctor = role === 'admin' || role === 'doctor';

  document.getElementById('invoice-card').style.display = canBilling ? '' : 'none';
  document.getElementById('plan-card').style.display = canDoctor ? '' : 'none';
  document.getElementById('rx-card').style.display = canDoctor ? '' : 'none';
}

async function loadAll() {
  const [patients, appts, invoices, plans, rx, notes] = await Promise.all([
    api('/api/patients'),
    api('/api/appointments'),
    api('/api/invoices'),
    api('/api/treatment-plans'),
    api('/api/prescriptions'),
    api('/api/notes')
  ]);

  patientsUl.innerHTML = patients.map(p => `<li><strong>${esc(p.name)}</strong><br><span class='muted'>${esc(p.phone || '')} • ${esc(p.dob || '')}</span></li>`).join('') || '<li class="muted">No data</li>';
  apptsUl.innerHTML = appts.map(a => `<li><strong>${esc(a.patient_name)}</strong><br><span class='muted'>${new Date(a.datetime).toLocaleString()} • ${esc(a.reason || '')}</span></li>`).join('') || '<li class="muted">No data</li>';
  invoicesUl.innerHTML = invoices.map(i => `<li><strong>${esc(i.patient_name)}</strong><br><span class='muted'>₹${Number(i.amount).toFixed(2)} • ${esc(i.status)} • ${esc(i.description || '')}</span><br><a href='/api/invoices/${i.id}/pdf' target='_blank'>Download PDF</a></li>`).join('') || '<li class="muted">No data</li>';
  plansUl.innerHTML = plans.map(p => `<li><strong>${esc(p.patient_name)}</strong><br><span class='muted'>Dx: ${esc(p.diagnosis)} | Status: ${esc(p.status)} | ₹${Number(p.estimated_cost || 0).toFixed(2)}</span><br>${esc(p.plan)}</li>`).join('') || '<li class="muted">No data</li>';
  rxUl.innerHTML = rx.map(r => `<li><strong>${esc(r.patient_name)}</strong><br><span class='muted'>${esc(r.medication)} • ${esc(r.dosage)} • ${esc(r.frequency)} • ${esc(r.duration)}</span><br>${esc(r.instructions || '')}</li>`).join('') || '<li class="muted">No data</li>';
  notesUl.innerHTML = notes.map(n => `<li><strong>${esc(n.patient_name)}</strong><br>${esc(n.note)}<br><span class='muted'>By ${esc(n.created_by)} on ${new Date(n.created_at).toLocaleString()}</span></li>`).join('') || '<li class="muted">No data</li>';

  const opts = patientOptions(patients);
  Object.values(selects).forEach(s => s.innerHTML = opts);
}

async function boot() {
  if (!token) return;
  try {
    const r = await api('/api/me');
    me = r.user;
    whoami.textContent = `Logged in as ${me.username} (${me.role})`;
    appArea.style.display = '';
    sessionCard.style.display = '';
    roleGate();
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
    roleGate();
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
    body: JSON.stringify({ patient_id: selects.appt.value, datetime: document.getElementById('appt-datetime').value, reason: document.getElementById('appt-reason').value }),
  });
  e.target.reset();
  await loadAll();
});

document.getElementById('invoice-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({ patient_id: selects.invoice.value, amount: document.getElementById('invoice-amount').value, status: document.getElementById('invoice-status').value, description: document.getElementById('invoice-desc').value }),
  });
  e.target.reset();
  await loadAll();
});

document.getElementById('plan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/treatment-plans', {
    method: 'POST',
    body: JSON.stringify({ patient_id: selects.plan.value, diagnosis: document.getElementById('plan-diagnosis').value, plan: document.getElementById('plan-text').value, estimated_cost: document.getElementById('plan-cost').value, status: document.getElementById('plan-status').value }),
  });
  e.target.reset();
  await loadAll();
});

document.getElementById('rx-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/prescriptions', {
    method: 'POST',
    body: JSON.stringify({ patient_id: selects.rx.value, medication: document.getElementById('rx-medication').value, dosage: document.getElementById('rx-dosage').value, frequency: document.getElementById('rx-frequency').value, duration: document.getElementById('rx-duration').value, instructions: document.getElementById('rx-instructions').value }),
  });
  e.target.reset();
  await loadAll();
});

document.getElementById('note-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ patient_id: selects.note.value, note: document.getElementById('note-text').value }),
  });
  e.target.reset();
  await loadAll();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('emr_token');
  location.reload();
});

boot();
