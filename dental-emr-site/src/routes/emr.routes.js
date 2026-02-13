import { Router } from 'express';
import db from '../config/db.js';
import { auth, permit } from '../middleware/auth.js';
import { streamInvoicePdf } from '../services/pdf.js';

const router = Router();
router.use(auth);

router.get('/patients', (_req, res) => {
  const rows = db.prepare('SELECT * FROM patients ORDER BY id DESC').all();
  res.json(rows);
});

router.post('/patients', permit('admin', 'reception', 'doctor'), (req, res) => {
  const { name, phone, dob } = req.body;
  const result = db.prepare('INSERT INTO patients (name, phone, dob, created_at) VALUES (?,?,?,?)')
    .run(name, phone || '', dob || '', new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

router.get('/appointments', (_req, res) => {
  const rows = db.prepare(`SELECT a.*, p.name as patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id ORDER BY datetime DESC`).all();
  res.json(rows);
});

router.post('/appointments', permit('admin', 'reception', 'doctor'), (req, res) => {
  const { patient_id, datetime, reason } = req.body;
  const result = db.prepare('INSERT INTO appointments (patient_id, datetime, reason, created_at) VALUES (?,?,?,?)')
    .run(patient_id, datetime, reason || '', new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

router.get('/notes', (_req, res) => {
  const rows = db.prepare(`SELECT n.*, p.name as patient_name FROM notes n JOIN patients p ON p.id=n.patient_id ORDER BY n.id DESC`).all();
  res.json(rows);
});

router.post('/notes', permit('admin', 'doctor'), (req, res) => {
  const { patient_id, note } = req.body;
  const result = db.prepare('INSERT INTO notes (patient_id, note, created_by, created_at) VALUES (?,?,?,?)')
    .run(patient_id, note, req.user.username, new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

router.get('/invoices', (_req, res) => {
  const rows = db.prepare(`SELECT i.*, p.name as patient_name FROM invoices i JOIN patients p ON p.id=i.patient_id ORDER BY i.id DESC`).all();
  res.json(rows);
});

router.post('/invoices', permit('admin', 'reception'), (req, res) => {
  const { patient_id, amount, status, description } = req.body;
  const result = db.prepare('INSERT INTO invoices (patient_id, amount, status, description, created_at) VALUES (?,?,?,?,?)')
    .run(patient_id, amount, status || 'unpaid', description || '', new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

router.get('/invoices/:id/pdf', (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, p.name as patient_name, p.phone, p.dob
    FROM invoices i
    JOIN patients p ON p.id=i.patient_id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  streamInvoicePdf(res, invoice);
});

router.get('/treatment-plans', (_req, res) => {
  const rows = db.prepare(`SELECT t.*, p.name as patient_name FROM treatment_plans t JOIN patients p ON p.id=t.patient_id ORDER BY t.id DESC`).all();
  res.json(rows);
});

router.post('/treatment-plans', permit('admin', 'doctor'), (req, res) => {
  const { patient_id, diagnosis, plan, estimated_cost, status } = req.body;
  const result = db.prepare(`
    INSERT INTO treatment_plans (patient_id, diagnosis, plan, estimated_cost, status, created_by, created_at)
    VALUES (?,?,?,?,?,?,?)
  `).run(patient_id, diagnosis, plan, estimated_cost || 0, status || 'proposed', req.user.username, new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

router.get('/prescriptions', (_req, res) => {
  const rows = db.prepare(`SELECT r.*, p.name as patient_name FROM prescriptions r JOIN patients p ON p.id=r.patient_id ORDER BY r.id DESC`).all();
  res.json(rows);
});

router.post('/prescriptions', permit('admin', 'doctor'), (req, res) => {
  const { patient_id, medication, dosage, frequency, duration, instructions } = req.body;
  const result = db.prepare(`
    INSERT INTO prescriptions (patient_id, medication, dosage, frequency, duration, instructions, prescribed_by, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(patient_id, medication, dosage, frequency, duration, instructions || '', req.user.username, new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

export default router;
