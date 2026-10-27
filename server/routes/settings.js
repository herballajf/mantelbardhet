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
    if (['smtp_pass', 'resend_api_key'].includes(r.key) && r.value) {
      settings[r.key] = '••••••••••••';
    } else {
      settings[r.key] = r.value;
    }
  }
  if (process.env.RESEND_API_KEY) settings.resend_api_key = '••••••••••••';
  if (process.env.EMAIL_PROVIDER) settings.email_provider = process.env.EMAIL_PROVIDER;
  if (process.env.SMTP_FROM) settings.smtp_from = process.env.SMTP_FROM;

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
  const { email_provider, resend_api_key, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, data_retention_days } = req.body;

  if (email_provider !== undefined && !['smtp', 'resend'].includes(email_provider)) {
    return res.status(400).json({ error: 'Ofruesi i emailit nuk është i vlefshëm.' });
  }

  transaction(() => {
    if (email_provider !== undefined && !process.env.EMAIL_PROVIDER) {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('email_provider', ?, datetime('now'))", [email_provider]);
    }
    if (resend_api_key !== undefined && resend_api_key !== '••••••••••••' && resend_api_key.trim() !== '') {
      execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('resend_api_key', ?, datetime('now'))", [resend_api_key.trim()]);
    }
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
    details: { email_provider, smtp_host, smtp_port, smtp_from, data_retention_days },
    ipAddress: req.ip
  });

  res.json({ success: true, message: 'Cilësimet e sistemit u ruajtën me sukses.' });
});

const { createTransporterInstance, sendResendEmail } = require('../services/emailService');

// POST /api/settings/test-email (Send real test email to verify SMTP credentials)
router.post('/test-email', authenticate, requireAdmin, async (req, res) => {
  const { test_email, email_provider, resend_api_key, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;
  if (!test_email) {
    return res.status(400).json({ error: 'Ju lutemi vendosni email adresën pranuese për testim.' });
  }

  // Use body values if provided, otherwise fetch from DB
  const host = smtp_host || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_host'")?.value;
  const port = smtp_port || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_port'")?.value || '587';
  const user = smtp_user || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_user'")?.value;
  let pass = smtp_pass;
  if (!pass || pass === '••••••••••••') {
    pass = queryOne("SELECT value FROM system_settings WHERE key = 'smtp_pass'")?.value;
  }
  const from = process.env.SMTP_FROM || smtp_from || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_from'")?.value || user || 'biletat@uni-pr.edu';
  const provider = process.env.EMAIL_PROVIDER
    || email_provider
    || queryOne("SELECT value FROM system_settings WHERE key = 'email_provider'")?.value
    || 'smtp';

  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY
      || (resend_api_key && resend_api_key !== '••••••••••••' ? resend_api_key : null)
      || queryOne("SELECT value FROM system_settings WHERE key = 'resend_api_key'")?.value;
    if (!apiKey || !from) {
      return res.status(400).json({
        error: 'Konfigurimi Resend është i paplotë. Plotësoni çelësin API dhe adresën dërguese të verifikuar.'
      });
    }

    try {
      const info = await sendResendEmail({
        from: `"Fakulteti i Mjekësisë - Test" <${from}>`,
        to: test_email,
        subject: 'Testim i Suksesshëm i Emailit – Universiteti i Prishtinës',
        text: 'Ky është një email testues për të konfirmuar konfigurimin e Resend.',
        html: '<p>Ky është një email testues për të konfirmuar konfigurimin e Resend.</p>'
      }, apiKey);

      logAudit({
        userId: req.user.id,
        action: 'EMAIL_API_TEST',
        entityType: 'settings',
        details: { provider: 'resend', recipient: test_email, messageId: info.messageId },
        ipAddress: req.ip
      });

      return res.json({
        success: true,
        message: `Emaili testues u dërgua me sukses te ${test_email}!`,
        messageId: info.messageId
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: `Dështoi dërgimi përmes Resend: ${err.message}`
      });
    }
  }

  if (!host || !user || !pass) {
    return res.status(400).json({
      error: 'Konfigurimi SMTP është i paplotë. Plotësoni Hosti, Përdoruesi dhe Fjalëkalimi para testimit.'
    });
  }

  try {
    const transporter = createTransporterInstance({ host, port, user, pass });

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
    let friendlyError = err.message;
    if (err.code === 'EAUTH' || err.message.includes('Username and Password not accepted')) {
      friendlyError = 'Google refuzoi fjalëkalimin. Sigurohuni që keni përdorur një "App Password" me 16 karaktere nga myaccount.google.com/apppasswords dhe jo fjalëkalimin e zakonshëm.';
    } else if (['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNECTION', 'ECONNREFUSED', 'EHOSTUNREACH'].includes(err.code)) {
      friendlyError = `Serveri nuk mund të lidhet me ${host}:${port}. Kontrolloni hostin dhe portin; për Gmail provoni portin 465 (SSL). Nëse jeni në cloud dhe timeout vazhdon, ofruesi mund të bllokojë lidhjet SMTP dalëse.`;
    }

    res.status(500).json({
      success: false,
      error: `Dështoi lidhja SMTP: ${friendlyError}`
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

// POST /api/settings/clear-sample-data (Wipe test registrations for a 100% clean production start)
router.post('/clear-sample-data', authenticate, requireAdmin, (req, res) => {
  execute('DELETE FROM registrations');
  execute('DELETE FROM sync_logs');

  logAudit({
    userId: req.user.id,
    action: 'CLEAR_SAMPLE_DATA',
    entityType: 'registrations',
    details: 'Pastroi të gjitha regjistrimet dhe logjet testuese',
    ipAddress: req.ip
  });

  res.json({
    success: true,
    message: 'Të gjitha të dhënat testuese u fshinë me sukses. Baza tani është e pastër për regjistrime reale!'
  });
});

// GET /api/audit-logs
router.get('/audit-logs', authenticate, requireAdmin, (req, res) => {
  const logs = getRecentAuditLogs(100);
  res.json({ logs });
});

module.exports = router;
