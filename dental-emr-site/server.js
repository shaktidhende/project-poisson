import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dental-emr-dev-secret';

const db = new Database(path.join(__dirname, 'emr.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','doctor','reception'))
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  dob TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  datetime TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL,
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('unpaid','paid','partial')),
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  diagnosis TEXT NOT NULL,
  plan TEXT NOT NULL,
  estimated_cost REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  medication TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  prescribed_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(patient_id) REFERENCES patients(id)
);
`);

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const insert = db.prepare('INSERT INTO users (username,password_hash,role) VALUES (?,?,?)');
  insert.run('admin', bcrypt.hashSync('Admin@123', 10), 'admin');
  insert.run('doctor1', bcrypt.hashSync('Doctor@123', 10), 'doctor');
  insert.run('reception1', bcrypt.hashSync('Reception@123', 10), 'reception');
}

app.use(express.json());
app.use(express.static(__dirname));

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function permit(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { username: user.username, role: user.role } });
});

app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));

app.get('/api/patients', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM patients ORDER BY id DESC').all();
  res.json(rows);
});
app.post('/api/patients', auth, permit('admin', 'reception', 'doctor'), (req, res) => {
  const { name, phone, dob } = req.body;
  const result = db.prepare('INSERT INTO patients (name, phone, dob, created_at) VALUES (?,?,?,?)')
    .run(name, phone || '', dob || '', new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/appointments', auth, (req, res) => {
  const rows = db.prepare(`SELECT a.*, p.name as patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id ORDER BY datetime DESC`).all();
  res.json(rows);
});
app.post('/api/appointments', auth, permit('admin', 'reception', 'doctor'), (req, res) => {
  const { patient_id, datetime, reason } = req.body;
  const result = db.prepare('INSERT INTO appointments (patient_id, datetime, reason, created_at) VALUES (?,?,?,?)')
    .run(patient_id, datetime, reason || '', new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/notes', auth, (req, res) => {
  const rows = db.prepare(`SELECT n.*, p.name as patient_name FROM notes n JOIN patients p ON p.id=n.patient_id ORDER BY n.id DESC`).all();
  res.json(rows);
});
app.post('/api/notes', auth, permit('admin', 'doctor'), (req, res) => {
  const { patient_id, note } = req.body;
  const result = db.prepare('INSERT INTO notes (patient_id, note, created_by, created_at) VALUES (?,?,?,?)')
    .run(patient_id, note, req.user.username, new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/invoices', auth, (req, res) => {
  const rows = db.prepare(`SELECT i.*, p.name as patient_name FROM invoices i JOIN patients p ON p.id=i.patient_id ORDER BY i.id DESC`).all();
  res.json(rows);
});
app.post('/api/invoices', auth, permit('admin', 'reception'), (req, res) => {
  const { patient_id, amount, status, description } = req.body;
  const result = db.prepare('INSERT INTO invoices (patient_id, amount, status, description, created_at) VALUES (?,?,?,?,?)')
    .run(patient_id, amount, status || 'unpaid', description || '', new Date().toISOString());
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/invoices/:id/pdf', auth, (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, p.name as patient_name, p.phone, p.dob
    FROM invoices i
    JOIN patients p ON p.id=i.patient_id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('DentalEMR Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice #: ${invoice.id}`);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleString()}`);
  doc.moveDown();
  doc.text(`Patient: ${invoice.patient_name}`);
  doc.text(`Phone: ${invoice.phone || '-'}`);
  doc.text(`DOB: ${invoice.dob || '-'}`);
  doc.moveDown();
  doc.text(`Description: ${invoice.description || '-'}`);
  doc.text(`Amount: ₹${Number(invoice.amount).toFixed(2)}`);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown();
  doc.text('Thank you for choosing DentalEMR.', { align: 'center' });

  doc.end();
});

app.get('/api/treatment-plans', auth, (req, res) => {
  const rows = db.prepare(`SELECT t.*, p.name as patient_name FROM treatment_plans t JOIN patients p ON p.id=t.patient_id ORDER BY t.id DESC`).all();
  res.json(rows);
});
app.post('/api/treatment-plans', auth, permit('admin', 'doctor'), (req, res) => {
  const { patient_id, diagnosis, plan, estimated_cost, status } = req.body;
  const result = db.prepare(`
    INSERT INTO treatment_plans (patient_id, diagnosis, plan, estimated_cost, status, created_by, created_at)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    patient_id,
    diagnosis,
    plan,
    estimated_cost || 0,
    status || 'proposed',
    req.user.username,
    new Date().toISOString()
  );
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/prescriptions', auth, (req, res) => {
  const rows = db.prepare(`SELECT r.*, p.name as patient_name FROM prescriptions r JOIN patients p ON p.id=r.patient_id ORDER BY r.id DESC`).all();
  res.json(rows);
});
app.post('/api/prescriptions', auth, permit('admin', 'doctor'), (req, res) => {
  const { patient_id, medication, dosage, frequency, duration, instructions } = req.body;
  const result = db.prepare(`
    INSERT INTO prescriptions (patient_id, medication, dosage, frequency, duration, instructions, prescribed_by, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    patient_id,
    medication,
    dosage,
    frequency,
    duration,
    instructions || '',
    req.user.username,
    new Date().toISOString()
  );
  res.json({ id: result.lastInsertRowid });
});

app.listen(PORT, () => {
  console.log(`DentalEMR running at http://localhost:${PORT}`);
});
