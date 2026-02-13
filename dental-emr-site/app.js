const KEY = 'dental_emr_demo_v1';

const state = JSON.parse(localStorage.getItem(KEY) || '{"patients":[],"appointments":[],"notes":[]}');

const patientForm = document.getElementById('patient-form');
const appointmentForm = document.getElementById('appointment-form');
const noteForm = document.getElementById('note-form');

const patientSelectAppt = document.getElementById('appt-patient');
const patientSelectNote = document.getElementById('note-patient');

const patientsList = document.getElementById('patients-list');
const appointmentsList = document.getElementById('appointments-list');
const notesList = document.getElementById('notes-list');

const patientsCount = document.getElementById('patients-count');
const appointmentsCount = document.getElementById('appointments-count');
const notesCount = document.getElementById('notes-count');

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function esc(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function getPatientName(id) {
  return state.patients.find(p => p.id === id)?.name || 'Unknown patient';
}

function renderPatientSelects() {
  const options = ['<option value="">Select patient</option>']
    .concat(state.patients.map(p => `<option value="${p.id}">${esc(p.name)}</option>`))
    .join('');

  patientSelectAppt.innerHTML = options;
  patientSelectNote.innerHTML = options;
}

function render() {
  patientsCount.textContent = state.patients.length;
  appointmentsCount.textContent = state.appointments.length;
  notesCount.textContent = state.notes.length;

  patientsList.innerHTML = state.patients.length
    ? state.patients.map(p => `
      <li>
        <strong>${esc(p.name)}</strong><br>
        <span class="muted">📞 ${esc(p.phone)} • DOB: ${esc(p.dob)}</span>
      </li>
    `).join('')
    : '<li class="muted">No patients yet.</li>';

  appointmentsList.innerHTML = state.appointments.length
    ? state.appointments
      .sort((a,b) => new Date(b.datetime) - new Date(a.datetime))
      .map(a => `
        <li>
          <strong>${esc(getPatientName(a.patientId))}</strong><br>
          <span class="muted">🗓️ ${new Date(a.datetime).toLocaleString()} • ${esc(a.reason)}</span>
        </li>
      `).join('')
    : '<li class="muted">No appointments yet.</li>';

  notesList.innerHTML = state.notes.length
    ? state.notes
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(n => `
        <li>
          <strong>${esc(getPatientName(n.patientId))}</strong><br>
          <span>${esc(n.note)}</span><br>
          <span class="muted">🕒 ${new Date(n.createdAt).toLocaleString()}</span>
        </li>
      `).join('')
    : '<li class="muted">No clinical notes yet.</li>';

  renderPatientSelects();
}

patientForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(patientForm);
  state.patients.push({
    id: uid(),
    name: form.get('name')?.toString().trim(),
    phone: form.get('phone')?.toString().trim(),
    dob: form.get('dob')?.toString(),
  });
  save();
  patientForm.reset();
  render();
});

appointmentForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(appointmentForm);
  state.appointments.push({
    id: uid(),
    patientId: form.get('patientId')?.toString(),
    datetime: form.get('datetime')?.toString(),
    reason: form.get('reason')?.toString(),
  });
  save();
  appointmentForm.reset();
  render();
});

noteForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(noteForm);
  state.notes.push({
    id: uid(),
    patientId: form.get('patientId')?.toString(),
    note: form.get('note')?.toString().trim(),
    createdAt: new Date().toISOString(),
  });
  save();
  noteForm.reset();
  render();
});

render();
