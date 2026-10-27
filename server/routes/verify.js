const express = require('express');
const router = express.Router();
const { queryOne, execute } = require('../db');
const { authenticate, requireStaffOrAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// GET /api/verify/public/:token (PUBLIC VERIFICATION ENDPOINT - MINIMAL DATA)
router.get('/public/:token', (req, res) => {
  const { token } = req.params;

  const reg = queryOne(`
    SELECT 
      r.ticket_number, r.first_name, r.last_name, r.status,
      r.checked_in, r.checked_in_at, r.created_at,
      e.name as event_name, e.event_date, e.event_time, e.location, e.organizer_name
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.verification_token = ?
  `, [token]);

  if (!reg) {
    return res.status(404).json({
      valid: false,
      status: 'invalid',
      message: 'Kjo biletë nuk u gjet në sistem ose kodi i verifikimit është i pavlefshëm.'
    });
  }

  if (reg.status === 'cancelled') {
    return res.json({
      valid: false,
      status: 'cancelled',
      ticket_number: reg.ticket_number,
      event_name: reg.event_name,
      message: 'Kjo biletë është anuluar nga administrata e fakultetit.'
    });
  }

  // Return minimal data for privacy (NO email, NO phone, NO guest list)
  res.json({
    valid: true,
    status: reg.checked_in ? 'checked_in' : 'valid',
    ticket_number: reg.ticket_number,
    participant_name: `${reg.first_name} ${reg.last_name}`,
    event_name: reg.event_name,
    event_date: reg.event_date,
    event_time: reg.event_time,
    location: reg.location,
    organizer_name: reg.organizer_name,
    checked_in: !!reg.checked_in,
    checked_in_at: reg.checked_in_at
  });
});

// POST /api/checkin/lookup (Staff / Admin Authenticated Scanner Lookup)
router.post('/lookup', authenticate, requireStaffOrAdmin, (req, res) => {
  const { query } = req.body; // Can be verification token, full QR URL, or ticket number
  if (!query) {
    return res.status(400).json({ error: 'Ju lutemi jepni kodin QR ose numrin e biletës.' });
  }

  let token = query.trim();
  // If it's a URL like http://.../verify/abc123
  if (token.includes('/verify/')) {
    const parts = token.split('/verify/');
    token = parts[parts.length - 1].split('?')[0].trim();
  }

  // Search by token or ticket_number
  const reg = queryOne(`
    SELECT r.*, e.name as event_name, e.event_date, e.event_time, e.location, e.organizer_name
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.verification_token = ? OR r.ticket_number = ?
  `, [token, token.toUpperCase()]);

  if (!reg) {
    return res.status(404).json({
      found: false,
      message: 'Bileta nuk u gjet. Ju lutemi kontrolloni kodin e biletës.'
    });
  }

  let guestList = [];
  try {
    guestList = typeof reg.guests_names === 'string' ? JSON.parse(reg.guests_names) : (reg.guests_names || []);
  } catch (e) {
    guestList = [];
  }

  res.json({
    found: true,
    registration: {
      ...reg,
      guest_list: guestList
    }
  });
});

// POST /api/checkin/confirm (Confirm Check-in by Staff)
router.post('/confirm', authenticate, requireStaffOrAdmin, (req, res) => {
  const { registration_id, force = false } = req.body;
  if (!registration_id) {
    return res.status(400).json({ error: 'ID e regjistrimit është e detyrueshme.' });
  }

  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [registration_id]);
  if (!reg) {
    return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });
  }

  if (reg.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      error: 'Bileta është e anuluar. Hyrja nuk lejohet!'
    });
  }

  // Check if already checked in
  if (reg.checked_in && !force) {
    return res.status(409).json({
      success: false,
      already_checked_in: true,
      checked_in_at: reg.checked_in_at,
      message: `KUJDES: Kjo biletë tashmë është përdorur më ${reg.checked_in_at}! Hyrja e përsëritur nuk lejohet sipas rregullores.`
    });
  }

  execute(
    `UPDATE registrations 
     SET checked_in = 1, checked_in_at = datetime('now'), checked_in_by = ?, updated_at = datetime('now') 
     WHERE id = ?`,
    [req.user.id, reg.id]
  );

  logAudit({
    userId: req.user.id,
    action: 'TICKET_CHECKIN',
    entityType: 'registrations',
    entityId: reg.id,
    details: { ticketNumber: reg.ticket_number, name: `${reg.first_name} ${reg.last_name}`, staff: req.user.full_name },
    ipAddress: req.ip
  });

  const updated = queryOne('SELECT * FROM registrations WHERE id = ?', [reg.id]);
  let guestList = [];
  try {
    guestList = typeof updated.guests_names === 'string' ? JSON.parse(updated.guests_names) : [];
  } catch (e) {}

  res.json({
    success: true,
    message: `Check-in u krye me sukses për ${updated.first_name} ${updated.last_name}!`,
    registration: {
      ...updated,
      guest_list: guestList
    }
  });
});

// POST /api/checkin/undo (Undo Check-in if error made)
router.post('/undo', authenticate, requireStaffOrAdmin, (req, res) => {
  const { registration_id } = req.body;
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [registration_id]);
  if (!reg) return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });

  execute(
    "UPDATE registrations SET checked_in = 0, checked_in_at = NULL, checked_in_by = NULL, updated_at = datetime('now') WHERE id = ?",
    [reg.id]
  );

  logAudit({
    userId: req.user.id,
    action: 'UNDO_CHECKIN',
    entityType: 'registrations',
    entityId: reg.id,
    details: { ticketNumber: reg.ticket_number },
    ipAddress: req.ip
  });

  res.json({ success: true, message: `Statusi i hyrjes për biletën ${reg.ticket_number} u rikthye në 'E papërdorur'.` });
});

module.exports = router;
