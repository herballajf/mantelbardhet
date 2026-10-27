const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { queryAll, queryOne, execute, transaction } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logAudit, getRecentAuditLogs } = require('../services/auditService');

// GET /api/settings
router.get('/', authenticate, requireAdmin, (req, res) => {
  const rows = queryAll('SELECT key, value FROM system_settings');
  const settings = {};
  for (const r of rows) {
    // Mask password
    if (r.key === 'smtp_pass' && r.value) {
      settings[r.key] = '••••••••••••';
    } else {
      settings[r.key] = r.value;
    }
  }

  // Count active registrations & audit logs
  const totalRegs = queryOne('SELECT COUNT(*) as count FROM registrations')?.count || 0;
  const totalAudit = queryOne('SELECT COUNT(*) as count FROM audit_logs')?.count || 0;

  res.json({
    settings,
    systemInfo: {
      totalRegistrations: totalRegs,
      totalAuditLogs: totalAudit,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime())
    }
  });
});

// PUT /api/settings (Update settings)
router.put('/', authenticate, requireAdmin, (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, data_retention_days } = req.body;

  transaction(() => {
    if (smtp_host !== undefined) {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('smtp_host', ?, datetime('now'))", [smtp_host.trim()]);
    }
    if (smtp_port !== undefined) {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('smtp_port', ?, datetime('now'))", [String(smtp_port).trim()]);
    }
    if (smtp_user !== undefined) {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('smtp_user', ?, datetime('now'))", [smtp_user.trim()]);
    }
    if (smtp_pass !== undefined && smtp_pass !== '••••••••••••' && smtp_pass.trim() !== '') {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('smtp_pass', ?, datetime('now'))", [smtp_pass.trim()]);
    }
    if (smtp_from !== undefined) {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('smtp_from', ?, datetime('now'))", [smtp_from.trim()]);
    }
    if (data_retention_days !== undefined) {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('data_retention_days', ?, datetime('now'))", [String(data_retention_days).trim()]);
    }
    execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('smtp_configured', '1', datetime('now'))");
  });

  logAudit({
    userId: req.user.id,
    action: 'UPDATE_SYSTEM_SETTINGS',
    entityType: 'settings',
    details: { smtp_host, smtp_port, smtp_from, data_retention_days },
    ipAddress: req.ip
  });

  res.json({ success: true, message: 'Cilësimet e sistemit u ruajtën me sukses.' });
});

// POST /api/settings/test-email (Send real test email to verify SMTP credentials)
router.post('/test-email', authenticate, requireAdmin, async (req, res) => {
  const { test_email } = req.body;
  if (!test_email) {
    return res.status(400).json({ error: 'Ju lutemi vendosni email adresën pranuese për testim.' });
  }

  const host = queryOne("SELECT value FROM system_settings WHERE key = 'smtp_host'")?.value;
  const port = parseInt(queryOne("SELECT value FROM system_settings WHERE key = 'smtp_port'")?.value || '587', 10);
  const user = queryOne("SELECT value FROM system_settings WHERE key = 'smtp_user'")?.value;
  const pass = queryOne("SELECT value FROM system_settings WHERE key = 'smtp_pass'")?.value;
  const from = queryOne("SELECT value FROM system_settings WHERE key = 'smtp_from'")?.value || 'biletat@uni-pr.edu';

  if (!host || !user || !pass) {
    return res.status(400).json({
      error: 'Konfigurimi SMTP është i paplotë. Vendosni Host, User dhe Fjalëkalimin para testimit.'
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Fakulteti i Mjekësisë - Test" <${from}>`,
      to: test_email,
      subject: '✓ Testim i Suksesshëm i Serverit SMTP – Universiteti i Prishtinës',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #C5A059; border-radius: 6px; background-color: #ffffff;">
          <h2 style="color: #0B1E36; margin-top: 0;">Fakulteti i Mjekësisë - Universiteti i Prishtinës</h2>
          <p style="color: #334155;">Ky është një email testues për të konfirmuar që konfigurimi SMTP funksionon me sukses.</p>
          <div style="background-color: #f1f5f9; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 13px;">
            Host: ${host}<br/>
            Port: ${port}<br/>
            Dërguesi: ${from}<br/>
            Koha e dërgimit: ${new Date().toLocaleString('sq-AL')}
          </div>
          <p style="color: #22c55e; font-weight: bold; margin-top: 16px;">✓ Lidhja dhe dërgimi u verifikuan me sukses!</p>
        </div>
      `
    });

    logAudit({
      userId: req.user.id,
      action: 'SMTP_TEST_EMAIL',
      entityType: 'settings',
      details: { recipient: test_email, messageId: info.messageId },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Emaili testues u dërgua me sukses te ${test_email}!`,
      messageId: info.messageId
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Dështoi lidhja SMTP: ${err.message}`
    });
  }
});

// POST /api/settings/retention/purge (Anonymize or purge registrations older than N days)
router.post('/retention/purge', authenticate, requireAdmin, (req, res) => {
  const daysSetting = queryOne("SELECT value FROM system_settings WHERE key = 'data_retention_days'")?.value || '365';
  const days = parseInt(daysSetting, 10);

  // Anonymize personal data of older registrations
  const affected = execute(`
    UPDATE registrations 
    SET 
      phone = NULL,
      notes = NULL,
      guests_names = '["I/e anonimizuar"]',
      submission_id = 'ANON-' || id,
      updated_at = datetime('now')
    WHERE created_at < datetime('now', '-' || ? || ' days')
      AND status = 'active'
  `, [days]);

  logAudit({
    userId: req.user.id,
    action: 'DATA_RETENTION_PURGE',
    entityType: 'registrations',
    details: { days, affectedRows: affected.changes },
    ipAddress: req.ip
  });

  res.json({
    success: true,
    message: `U anonimizuan të dhënat e ndjeshme për ${affected.changes} regjistrime më të vjetra se ${days} ditë sipas rregullores së privatësisë.`,
    affectedRows: affected.changes
  });
});

// GET /api/audit-logs
router.get('/audit-logs', authenticate, requireAdmin, (req, res) => {
  const logs = getRecentAuditLogs(100);
  res.json({ logs });
});

module.exports = router;
