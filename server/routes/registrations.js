const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { queryAll, queryOne, execute, transaction } = require('../db');
const { authenticate, requireAdmin, requireStaffOrAdmin } = require('../middleware/auth');
const { generateTicketPdf } = require('../services/pdfGenerator');
const { sendTicketEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const { generateNextTicketNumber, parseGuests } = require('../services/webhookService');

// GET /api/registrations (list, filter, search)
router.get('/', authenticate, requireStaffOrAdmin, (req, res) => {
  const { event_id, search, ticket_status, email_status, checked_in, page = 1, limit = 50 } = req.query;

  let conditions = [];
  let params = [];

  if (event_id) {
    conditions.push('r.event_id = ?');
    params.push(event_id);
  }

  if (ticket_status) {
    conditions.push('r.status = ?');
    params.push(ticket_status);
  }

  if (email_status) {
    conditions.push('r.email_status = ?');
    params.push(email_status);
  }

  if (checked_in !== undefined && checked_in !== '') {
    conditions.push('r.checked_in = ?');
    params.push(checked_in === '1' || checked_in === 'true' ? 1 : 0);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push('(r.first_name LIKE ? OR r.last_name LIKE ? OR r.email LIKE ? OR r.ticket_number LIKE ? OR r.programme LIKE ?)');
    params.push(s, s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countRow = queryOne(`SELECT COUNT(*) as total FROM registrations r ${whereClause}`, params);
  const total = countRow ? countRow.total : 0;

  // Pagination
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const sql = `
    SELECT r.*, e.name as event_name, e.event_date, e.ticket_prefix, e.ticket_format
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    ${whereClause}
    ORDER BY r.id DESC
    LIMIT ? OFFSET ?
  `;

  const registrations = queryAll(sql, [...params, parseInt(limit, 10), offset]);

  res.json({
    registrations,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    }
  });
});

// GET /api/registrations/:id
router.get('/:id', authenticate, requireStaffOrAdmin, (req, res) => {
  const reg = queryOne(`
    SELECT r.*, e.name as event_name, e.event_date, e.event_time, e.location, e.organizer_name, e.ticket_format
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = ?
  `, [req.params.id]);

  if (!reg) return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });
  res.json({ registration: reg });
});

// POST /api/registrations (Manual Registration by Admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { event_id, first_name, last_name, email, programme, phone, guests_names, notes, send_email = true } = req.body;

  if (!event_id || !first_name || !last_name || !email || !programme) {
    return res.status(400).json({ error: 'Eventi, emri, mbiemri, emaili dhe dega e studimit janë të detyrueshme.' });
  }

  const event = queryOne('SELECT * FROM events WHERE id = ?', [event_id]);
  if (!event) return res.status(404).json({ error: 'Aktiviteti nuk u gjet.' });

  const { guestList, guestCount } = parseGuests(guests_names);
  const ticketNumber = generateNextTicketNumber(event);
  const verificationToken = crypto.randomBytes(16).toString('hex');
  const submissionId = `MANUAL-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  let regId;
  transaction(() => {
    const insertRes = execute(
      `INSERT INTO registrations (
        event_id, submission_id, ticket_number, verification_token,
        first_name, last_name, email, programme, phone,
        guests_count, guests_names, notes, status,
        ticket_generated, email_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 'queued')`,
      [
        event.id, submissionId, ticketNumber, verificationToken,
        first_name.trim(), last_name.trim(), email.trim().toLowerCase(),
        programme.trim(), phone ? phone.trim() : null,
        guestCount, JSON.stringify(guestList), notes ? notes.trim() : null
      ]
    );
    regId = Number(insertRes.lastInsertRowid);
  });

  const createdReg = queryOne('SELECT * FROM registrations WHERE id = ?', [regId]);

  // Generate PDF
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const pdfRes = await generateTicketPdf({
    registration: createdReg,
    event,
    format: event.ticket_format || 'a4',
    baseUrl
  });

  execute(
    "UPDATE registrations SET ticket_generated = 1, ticket_pdf_path = ?, updated_at = datetime('now') WHERE id = ?",
    [pdfRes.filePath, regId]
  );

  let emailSent = false;
  if (send_email) {
    const mailRes = await sendTicketEmail(regId, { baseUrl });
    emailSent = mailRes.success;
  }

  logAudit({
    userId: req.user.id,
    action: 'MANUAL_REGISTRATION',
    entityType: 'registrations',
    entityId: regId,
    details: { ticketNumber, fullName: `${first_name} ${last_name}`, email, guestCount },
    ipAddress: req.ip
  });

  const finalReg = queryOne('SELECT * FROM registrations WHERE id = ?', [regId]);
  res.status(201).json({
    success: true,
    registration: finalReg,
    ticketNumber,
    emailSent
  });
});

// PUT /api/registrations/:id (Edit registration details)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
  if (!reg) return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });

  const { first_name, last_name, email, programme, phone, guests_names, notes, status } = req.body;

  let guestList = null;
  let guestCount = null;
  if (guests_names !== undefined) {
    const parsed = parseGuests(guests_names);
    guestList = JSON.stringify(parsed.guestList);
    guestCount = parsed.guestCount;
  }

  execute(
    `UPDATE registrations SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      email = COALESCE(?, email),
      programme = COALESCE(?, programme),
      phone = COALESCE(?, phone),
      guests_names = COALESCE(?, guests_names),
      guests_count = COALESCE(?, guests_count),
      notes = COALESCE(?, notes),
      status = COALESCE(?, status),
      updated_at = datetime('now')
    WHERE id = ?`,
    [
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      email ? email.trim().toLowerCase() : null,
      programme ? programme.trim() : null,
      phone !== undefined ? (phone ? phone.trim() : null) : null,
      guestList,
      guestCount,
      notes !== undefined ? (notes ? notes.trim() : null) : null,
      status || null,
      reg.id
    ]
  );

  // Regenerate PDF automatically to reflect modified details
  const updatedReg = queryOne('SELECT * FROM registrations WHERE id = ?', [reg.id]);
  const event = queryOne('SELECT * FROM events WHERE id = ?', [updatedReg.event_id]);
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const pdfRes = await generateTicketPdf({
    registration: updatedReg,
    event,
    format: event.ticket_format || 'a4',
    baseUrl
  });

  execute(
    "UPDATE registrations SET ticket_pdf_path = ?, updated_at = datetime('now') WHERE id = ?",
    [pdfRes.filePath, reg.id]
  );

  logAudit({
    userId: req.user.id,
    action: 'UPDATE_REGISTRATION',
    entityType: 'registrations',
    entityId: reg.id,
    details: { changes: req.body },
    ipAddress: req.ip
  });

  const refreshed = queryOne('SELECT * FROM registrations WHERE id = ?', [reg.id]);
  res.json({ success: true, registration: refreshed });
});

// DELETE /api/registrations/:id (Cancel registration)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
  if (!reg) return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });

  execute("UPDATE registrations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [reg.id]);

  logAudit({
    userId: req.user.id,
    action: 'CANCEL_REGISTRATION',
    entityType: 'registrations',
    entityId: reg.id,
    details: { ticketNumber: reg.ticket_number, name: `${reg.first_name} ${reg.last_name}` },
    ipAddress: req.ip
  });

  res.json({ success: true, message: `Bileta ${reg.ticket_number} u anulua me sukses.` });
});

// GET /api/registrations/:id/pdf (Download PDF Ticket)
router.get('/:id/pdf', authenticate, requireStaffOrAdmin, async (req, res) => {
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
  if (!reg) return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });

  const event = queryOne('SELECT * FROM events WHERE id = ?', [reg.event_id]);
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  let pdfPath = reg.ticket_pdf_path;
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    const pdfRes = await generateTicketPdf({
      registration: reg,
      event,
      format: event.ticket_format || 'a4',
      baseUrl
    });
    pdfPath = pdfRes.filePath;
    execute("UPDATE registrations SET ticket_generated = 1, ticket_pdf_path = ?, updated_at = datetime('now') WHERE id = ?", [pdfPath, reg.id]);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Bileta-Zyrtare-${reg.ticket_number}.pdf"`);
  const fileStream = fs.createReadStream(pdfPath);
  fileStream.pipe(res);
});

// POST /api/registrations/:id/regenerate (Regenerate ticket)
router.post('/:id/regenerate', authenticate, requireAdmin, async (req, res) => {
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
  if (!reg) return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });

  const event = queryOne('SELECT * FROM events WHERE id = ?', [reg.event_id]);
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const pdfRes = await generateTicketPdf({
    registration: reg,
    event,
    format: req.body.format || event.ticket_format || 'a4',
    baseUrl
  });

  execute(
    "UPDATE registrations SET ticket_generated = 1, ticket_pdf_path = ?, updated_at = datetime('now') WHERE id = ?",
    [pdfRes.filePath, reg.id]
  );

  logAudit({
    userId: req.user.id,
    action: 'REGENERATE_TICKET',
    entityType: 'registrations',
    entityId: reg.id,
    details: { ticketNumber: reg.ticket_number, format: pdfRes.format },
    ipAddress: req.ip
  });

  res.json({
    success: true,
    message: `Bileta ${reg.ticket_number} u rigjenerua me sukses në formatin ${pdfRes.format.toUpperCase()}.`,
    pdfPath: pdfRes.filePath
  });
});

// POST /api/registrations/:id/resend (Resend ticket email)
router.post('/:id/resend', authenticate, requireAdmin, async (req, res) => {
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
  if (!reg) return res.status(404).json({ error: 'Regjistrimi nuk u gjet.' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const result = await sendTicketEmail(reg.id, { baseUrl, forceRegenerate: req.body.forceRegenerate || false });

  logAudit({
    userId: req.user.id,
    action: 'RESEND_EMAIL',
    entityType: 'registrations',
    entityId: reg.id,
    details: { ticketNumber: reg.ticket_number, recipient: reg.email, success: result.success },
    ipAddress: req.ip
  });

  if (!result.success) {
    return res.status(500).json({ error: `Dërgimi i emailit dështoi: ${result.error}` });
  }

  res.json({
    success: true,
    message: `Bileta iu ridërgua me sukses adresës ${reg.email}.`,
    messageId: result.messageId
  });
});

// GET /api/registrations/export/csv
router.get('/export/csv', authenticate, requireAdmin, (req, res) => {
  const { event_id } = req.query;

  let sql = `
    SELECT 
      r.ticket_number, r.first_name, r.last_name, r.email, r.programme, r.phone,
      r.guests_count, r.guests_names, r.status, r.email_status,
      r.checked_in, r.checked_in_at, r.created_at, e.name as event_name
    FROM registrations r
    JOIN events e ON r.event_id = e.id
  `;
  const params = [];

  if (event_id) {
    sql += ' WHERE r.event_id = ?';
    params.push(event_id);
  }

  sql += ' ORDER BY r.id ASC';

  const rows = queryAll(sql, params);

  // Generate CSV
  const headers = [
    'Numri i Biletës', 'Emri', 'Mbiemri', 'Email', 'Programi i Studimit', 'Telefoni',
    'Nr Shoqëruesve', 'Personat Shoqërues', 'Statusi i Biletës', 'Statusi i Emailit',
    'Check-in', 'Koha e Check-in', 'Koha e Regjistrimit', 'Aktiviteti'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvLines = [headers.join(',')];

  for (const row of rows) {
    let guestStr = '';
    try {
      const parsed = JSON.parse(row.guests_names);
      guestStr = Array.isArray(parsed) ? parsed.join('; ') : row.guests_names;
    } catch (e) {
      guestStr = row.guests_names || '';
    }

    csvLines.push([
      escapeCsv(row.ticket_number),
      escapeCsv(row.first_name),
      escapeCsv(row.last_name),
      escapeCsv(row.email),
      escapeCsv(row.programme),
      escapeCsv(row.phone || ''),
      escapeCsv(row.guests_count),
      escapeCsv(guestStr),
      escapeCsv(row.status),
      escapeCsv(row.email_status),
      escapeCsv(row.checked_in ? 'PO' : 'JO'),
      escapeCsv(row.checked_in_at || ''),
      escapeCsv(row.created_at),
      escapeCsv(row.event_name)
    ].join(','));
  }

  // Prepend UTF-8 BOM so Excel opens diacritics correctly (ë, ç)
  const csvBuffer = Buffer.concat([Buffer.from('\uFEFF', 'utf-8'), Buffer.from(csvLines.join('\r\n'), 'utf-8')]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="regjistrimet-up-medicina-${Date.now()}.csv"`);
  res.send(csvBuffer);
});

module.exports = router;
