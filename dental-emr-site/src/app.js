import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import emrRoutes from './routes/emr.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

export function createApp() {
  initDb();

  const app = express();
  app.use(express.json());
  app.use(express.static(projectRoot));

  app.use('/api', authRoutes);
  app.use('/api', emrRoutes);

  return app;
}
