require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const { createTransporterInstance } = require('./services/emailService');

function createEmailRelayApp({ secret = process.env.EMAIL_RELAY_SECRET, sendMail } = {}) {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  app.post('/send', async (req, res) => {
    const suppliedSecret = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const expected = Buffer.from(secret || '');
    const supplied = Buffer.from(suppliedSecret);
    const isAuthorized = expected.length > 0
      && expected.length === supplied.length
      && crypto.timingSafeEqual(expected, supplied);

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized email relay request.' });
    }

    const { from, to, subject, html, text, attachments = [] } = req.body || {};
    if (!from || !to || !subject || !Array.isArray(attachments)) {
      return res.status(400).json({ error: 'Email is missing required fields.' });
    }

    const mailOptions = {
      from,
      to,
      subject,
      html,
      text,
      attachments: attachments.map(({ filename, content }) => ({
        filename,
        content: Buffer.from(content || '', 'base64')
      }))
    };

    try {
      const info = await sendMail(mailOptions);
      res.json({ success: true, messageId: info.messageId });
    } catch (err) {
      console.error('Local SMTP relay delivery failed:', err.message);
      res.status(502).json({ error: err.message || 'SMTP delivery failed.' });
    }
  });

  return app;
}

if (require.main === module) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_RELAY_SECRET } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_RELAY_SECRET) {
    console.error('Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_RELAY_SECRET before starting the relay.');
    process.exit(1);
  }

  const transporter = createTransporterInstance({
    host: SMTP_HOST,
    port: SMTP_PORT || '587',
    user: SMTP_USER,
    pass: SMTP_PASS
  });
  const app = createEmailRelayApp({
    secret: EMAIL_RELAY_SECRET,
    sendMail: (mailOptions) => transporter.sendMail(mailOptions)
  });
  const port = Number(process.env.RELAY_PORT || 3100);

  app.listen(port, '127.0.0.1', () => {
    console.log(`Local SMTP relay listening on http://127.0.0.1:${port}`);
  });
}

module.exports = { createEmailRelayApp };
