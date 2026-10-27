const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, execute } = require('../db');
const { generateToken, authenticate, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Ju lutemi plotësoni përdoruesin dhe fjalëkalimin.' });
  }

  const user = queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [username.trim(), username.trim().toLowerCase()]);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Kredencialet e dhëna janë të pasakta.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Kredencialet e dhëna janë të pasakta.' });
  }

  const token = generateToken(user);
  logAudit({
    userId: user.id,
    action: 'USER_LOGIN',
    entityType: 'users',
    entityId: user.id,
    details: { username: user.username, role: user.role },
    ipAddress: req.ip
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role
    }
  });
});

// GET /api/auth/users (admin only)
router.get('/users', authenticate, requireAdmin, (req, res) => {
  const users = queryAll('SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY id ASC');
  res.json({ users });
});

// POST /api/auth/users (admin only)
router.post('/users', authenticate, requireAdmin, (req, res) => {
  const { username, email, password, fullName, role } = req.body;
  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: 'Të gjitha fushat janë të detyrueshme.' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim().toLowerCase()]);
  if (existing) {
    return res.status(400).json({ error: 'Një përdorues me këtë username ose email tashmë ekziston.' });
  }

  const passHash = bcrypt.hashSync(password, 10);
  const result = execute(
    'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
    [username.trim(), email.trim().toLowerCase(), passHash, fullName.trim(), role === 'admin' ? 'admin' : 'staff']
  );

  logAudit({
    userId: req.user.id,
    action: 'CREATE_USER',
    entityType: 'users',
    entityId: result.lastInsertRowid,
    details: { username, role },
    ipAddress: req.ip
  });

  res.status(201).json({ success: true, userId: result.lastInsertRowid });
});

module.exports = router;
