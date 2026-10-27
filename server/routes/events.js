const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { queryAll, queryOne, execute } = require('../db');
const { authenticate, requireAdmin, requireStaffOrAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// Multer storage for event logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|svg|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Lejohen vetëm formate imazhi (PNG, JPG, SVG, WEBP).'));
  }
});

// GET /api/events (accessible to staff & admin)
router.get('/', authenticate, requireStaffOrAdmin, (req, res) => {
  const events = queryAll(`
    SELECT e.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'active') as total_registrations,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.ticket_generated = 1 AND r.status = 'active') as tickets_generated,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.email_status = 'sent' AND r.status = 'active') as emails_sent,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.email_status = 'failed' AND r.status = 'active') as emails_failed,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.checked_in = 1 AND r.status = 'active') as checked_in_count,
      (SELECT COALESCE(SUM(r.guests_count), 0) FROM registrations r WHERE r.event_id = e.id AND r.status = 'active') as total_guests
    FROM events e
    ORDER BY e.event_date DESC, e.id DESC
  `);

  res.json({ events });
});

// GET /api/events/:id
router.get('/:id', authenticate, requireStaffOrAdmin, (req, res) => {
  const event = queryOne('SELECT * FROM events WHERE id = ?', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Aktiviteti nuk u gjet.' });

  const stats = queryOne(`
    SELECT 
      COUNT(*) as total_registrations,
      SUM(CASE WHEN ticket_generated = 1 THEN 1 ELSE 0 END) as tickets_generated,
      SUM(CASE WHEN email_status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
      SUM(CASE WHEN email_status = 'queued' THEN 1 ELSE 0 END) as emails_queued,
      SUM(CASE WHEN email_status = 'failed' THEN 1 ELSE 0 END) as emails_failed,
      SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in_count,
      COALESCE(SUM(guests_count), 0) as total_guests
    FROM registrations
    WHERE event_id = ? AND status = 'active'
  `, [event.id]);

  res.json({ event, stats });
});

// POST /api/events (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const {
    name, description, event_date, event_time, location,
    organizer_name, is_ksfm_event, ticket_format, ticket_prefix,
    auto_generate_tickets, email_subject, email_body, field_mapping
  } = req.body;

  if (!name || !event_date || !event_time || !location) {
    return res.status(400).json({ error: 'Emri, data, ora dhe lokacioni janë të detyrueshme.' });
  }

  // Generate unique slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existingSlug = queryOne('SELECT id FROM events WHERE slug = ?', [baseSlug]);
  const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  const webhook_secret = `${slug.substring(0, 10)}_sec_${crypto.randomBytes(6).toString('hex')}`;
  const defaultMapping = JSON.stringify({
    first_name: 'Emri',
    last_name: 'Mbiemri',
    email: 'Email Adresa',
    programme: 'Dega / Programi i Studimit',
    guests_names: 'Emrat e Personave Shoqërues',
    guests_count: 'Numri i Personave Shoqërues',
    phone: 'Numri i Telefonit',
    submission_id: 'Timestamp'
  });

  const defaultBody = `I/e nderuar {first_name} {last_name},

Regjistrimi juaj për aktivitetin "{event_name}" është pranuar me sukses.

Bashkëngjitur gjeni biletën tuaj personale zyrtare në formatin PDF. Ju lutemi, ruajeni dhe paraqiteni këtë biletë gjatë hyrjes në aktivitet.

Bileta përmban të dhënat tuaja, numrin unik të biletës ({ticket_number}) dhe informacionin për personat shoqërues ({guests_count} shoqërues).

Data dhe ora: {event_date}, {event_time}
Vendi: {location}

Me respekt,
{organizer_name}`;

  const result = execute(
    `INSERT INTO events (
      slug, name, description, event_date, event_time, location, organizer_name,
      is_ksfm_event, ticket_format, ticket_prefix, auto_generate_tickets,
      email_subject, email_body, webhook_secret, field_mapping
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug, name.trim(), description || '', event_date, event_time, location.trim(),
      organizer_name || 'Fakulteti i Mjekësisë - Universiteti i Prishtinës',
      is_ksfm_event !== undefined ? (is_ksfm_event ? 1 : 0) : 1,
      ticket_format === 'compact' ? 'compact' : 'a4',
      (ticket_prefix || 'MED').toUpperCase().trim(),
      auto_generate_tickets !== undefined ? (auto_generate_tickets ? 1 : 0) : 1,
      email_subject || 'Bileta juaj zyrtare – {event_name}',
      email_body || defaultBody,
      webhook_secret,
      field_mapping ? (typeof field_mapping === 'string' ? field_mapping : JSON.stringify(field_mapping)) : defaultMapping
    ]
  );

  const eventId = result.lastInsertRowid;
  logAudit({
    userId: req.user.id,
    action: 'CREATE_EVENT',
    entityType: 'events',
    entityId: eventId,
    details: { name, slug, ticket_format },
    ipAddress: req.ip
  });

  const created = queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
  res.status(201).json({ event: created });
});

// PUT /api/events/:id (admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const event = queryOne('SELECT * FROM events WHERE id = ?', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Aktiviteti nuk u gjet.' });

  const {
    name, description, event_date, event_time, location,
    organizer_name, is_ksfm_event, ticket_format, ticket_prefix,
    auto_generate_tickets, email_subject, email_body, field_mapping, is_active
  } = req.body;

  execute(
    `UPDATE events SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      event_date = COALESCE(?, event_date),
      event_time = COALESCE(?, event_time),
      location = COALESCE(?, location),
      organizer_name = COALESCE(?, organizer_name),
      is_ksfm_event = COALESCE(?, is_ksfm_event),
      ticket_format = COALESCE(?, ticket_format),
      ticket_prefix = COALESCE(?, ticket_prefix),
      auto_generate_tickets = COALESCE(?, auto_generate_tickets),
      email_subject = COALESCE(?, email_subject),
      email_body = COALESCE(?, email_body),
      field_mapping = COALESCE(?, field_mapping),
      is_active = COALESCE(?, is_active),
      updated_at = datetime('now')
    WHERE id = ?`,
    [
      name ? name.trim() : null,
      description !== undefined ? description : null,
      event_date || null,
      event_time || null,
      location ? location.trim() : null,
      organizer_name ? organizer_name.trim() : null,
      is_ksfm_event !== undefined ? (is_ksfm_event ? 1 : 0) : null,
      ticket_format || null,
      ticket_prefix ? ticket_prefix.toUpperCase().trim() : null,
      auto_generate_tickets !== undefined ? (auto_generate_tickets ? 1 : 0) : null,
      email_subject || null,
      email_body || null,
      field_mapping ? (typeof field_mapping === 'string' ? field_mapping : JSON.stringify(field_mapping)) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      event.id
    ]
  );

  logAudit({
    userId: req.user.id,
    action: 'UPDATE_EVENT',
    entityType: 'events',
    entityId: event.id,
    details: { name },
    ipAddress: req.ip
  });

  const updated = queryOne('SELECT * FROM events WHERE id = ?', [event.id]);
  res.json({ event: updated });
});

// DELETE /api/events/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const event = queryOne('SELECT * FROM events WHERE id = ?', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Aktiviteti nuk u gjet.' });

  execute('DELETE FROM events WHERE id = ?', [event.id]);

  logAudit({
    userId: req.user.id,
    action: 'DELETE_EVENT',
    entityType: 'events',
    entityId: event.id,
    details: { name: event.name },
    ipAddress: req.ip
  });

  res.json({ success: true, message: `Aktiviteti "${event.name}" u fshi me sukses.` });
});

// POST /api/events/:id/logo (admin only)
router.post('/:id/logo', authenticate, requireAdmin, upload.single('logo'), (req, res) => {
  const event = queryOne('SELECT * FROM events WHERE id = ?', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Aktiviteti nuk u gjet.' });
  if (!req.file) return res.status(400).json({ error: 'Asnjë skedar nuk u ngarkua.' });

  const logoUrl = `/uploads/logos/${req.file.filename}`;
  execute("UPDATE events SET logo_url = ?, updated_at = datetime('now') WHERE id = ?", [logoUrl, event.id]);

  logAudit({
    userId: req.user.id,
    action: 'UPLOAD_EVENT_LOGO',
    entityType: 'events',
    entityId: event.id,
    details: { logoUrl },
    ipAddress: req.ip
  });

  res.json({ success: true, logoUrl });
});

module.exports = router;
