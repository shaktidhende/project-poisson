import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { JWT_SECRET } from '../config/constants.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: { username: user.username, role: user.role } });
});

router.get('/me', auth, (req, res) => res.json({ user: req.user }));

export default router;
