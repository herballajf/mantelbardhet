const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'up-med-secret-super-key-2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autorizimi mungon. Ju lutemi kyçuni në sistem.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = queryOne('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?', [decoded.id]);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Llogaria është joaktive ose nuk ekziston më.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesioni ka skaduar ose tokeni është i pavlefshëm.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Qasje e refuzuar: Ky veprim kërkon privilegje administrative.' });
  }
  next();
}

function requireStaffOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Qasje e refuzuar: Kërkohet autorizim nga stafi ose administratori.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticate,
  requireAdmin,
  requireStaffOrAdmin
};
