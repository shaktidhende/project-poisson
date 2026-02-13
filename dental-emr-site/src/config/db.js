import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '..', '..', 'emr.db'));
db.pragma('journal_mode = WAL');

export function initDb() {
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
}

export default db;
