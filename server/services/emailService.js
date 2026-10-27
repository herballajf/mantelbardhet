const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { queryOne, queryAll, execute } = require('../db');
const { generateTicketPdf } = require('./pdfGenerator');

let testTransporter = null;

// Build SMTP Transporter
async function getTransporter() {
  const host = process.env.SMTP_HOST || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_host'")?.value;
  const port = parseInt(process.env.SMTP_PORT || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_port'")?.value || '587', 10);
  const user = process.env.SMTP_USER || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_user'")?.value;
  const pass = process.env.SMTP_PASS || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_pass'")?.value;
  const secure = port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  // Fallback to simulated/test transporter for development or when unconfigured
  if (!testTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('✓ Ethereal test SMTP account initialized:', testAccount.user);
    } catch (err) {
      // In-memory mock transporter if network is restricted
      testTransporter = {
        sendMail: async (mailOptions) => {
          console.log(`[Mock Mailer] Sent email to ${mailOptions.to} with subject "${mailOptions.subject}"`);
          return {
            messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            accepted: [mailOptions.to],
            response: '250 2.0.0 OK: Mock message queued and delivered'
          };
        },
        verify: async () => true
      };
    }
  }

  return testTransporter;
}

// Replace template variables
function renderTemplate(template, vars) {
  let result = template || '';
  for (const [key, val] of Object.entries(vars)) {
    const re = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(re, val !== null && val !== undefined ? val : '');
  }
  return result;
}

// Build professional institutional HTML email template
function buildHtmlEmail({ recipientName, eventName, ticketNumber, eventDate, eventTime, location, organizerName, guestsCount, customBody }) {
  const formattedBody = (customBody || '')
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bileta Zyrtare – ${eventName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <!-- Top Navy Header Banner -->
    <div style="background-color: #0B1E36; padding: 28px 24px; text-align: center; border-bottom: 4px solid #C5A059;">
      <p style="margin: 0; color: #C5A059; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">UNIVERSITETI I PRISHTINËS</p>
      <h1 style="margin: 6px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">FAKULTETI I MJEKËSISË</h1>
      <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Sistemi Zyrtar i Biletave dhe Regjistrimeve</p>
    </div>

    <!-- Main Content Body -->
    <div style="padding: 32px 28px;">
      <div style="display: inline-block; background-color: #f5eedc; color: #0B1E36; border: 1px solid #C5A059; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-bottom: 16px;">
        BILETË E KONFIRMUAR • ${ticketNumber}
      </div>

      <div style="font-size: 15px;">
        ${formattedBody}
      </div>

      <!-- Event Details Card -->
      <div style="margin: 24px 0; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 18px;">
        <h3 style="margin: 0 0 12px 0; color: #0B1E36; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Detajet e Aktivitetit:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; width: 35%;">Aktiviteti:</td>
            <td style="padding: 6px 0; color: #0B1E36; font-weight: 700;">${eventName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Data dhe Ora:</td>
            <td style="padding: 6px 0;">${eventDate} në ora ${eventTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Vendi:</td>
            <td style="padding: 6px 0;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Shoqërues:</td>
            <td style="padding: 6px 0;">${guestsCount} persona të regjistruar</td>
          </tr>
        </table>
      </div>

      <!-- Attachment Notice Callout -->
      <div style="background-color: #ebf1fa; border-left: 4px solid #0B1E36; padding: 14px; border-radius: 0 4px 4px 0; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #0B1E36; font-weight: 600;">
          📎 Bileta juaj personale në formatin PDF gjendet e bashkëngjitur në këtë email.
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
          Ju lutemi ta shkarkoni dhe ta paraqitni atë në telefon ose të printuar te hyrja e sallës.
        </p>
      </div>

      <p style="margin: 20px 0 0 0; font-size: 14px; color: #334155;">
        Me respekt,<br/>
        <strong style="color: #0B1E36;">${organizerName}</strong>
      </p>
    </div>

    <!-- Institutional Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center;">
      <p style="margin: 0; color: #64748b; font-size: 11px;">
        Fakulteti i Mjekësisë • Universiteti i Prishtinës "Hasan Prishtina"<br/>
        Ky është një njoftim zyrtar i automatizuar i dërguar pas regjistrimit tuaj.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send Ticket Email for a registration
 */
async function sendTicketEmail(registrationId, options = {}) {
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [registrationId]);
  if (!reg) {
    throw new Error(`Regjistrimi me ID ${registrationId} nuk u gjet.`);
  }

  const event = queryOne('SELECT * FROM events WHERE id = ?', [reg.event_id]);
  if (!event) {
    throw new Error(`Ngjarja me ID ${reg.event_id} nuk u gjet.`);
  }

  // Parse guests
  let guestList = [];
  try {
    guestList = typeof reg.guests_names === 'string' ? JSON.parse(reg.guests_names) : (reg.guests_names || []);
  } catch (e) {
    guestList = [];
  }

  // Ensure PDF is generated
  let pdfBuffer;
  let pdfPath = reg.ticket_pdf_path;

  if (pdfPath && fs.existsSync(pdfPath) && !options.forceRegenerate) {
    pdfBuffer = fs.readFileSync(pdfPath);
  } else {
    const pdfRes = await generateTicketPdf({
      registration: reg,
      event,
      format: event.ticket_format || 'a4',
      baseUrl: options.baseUrl || 'http://localhost:3000'
    });
    pdfBuffer = pdfRes.buffer;
    pdfPath = pdfRes.filePath;

    execute(
      "UPDATE registrations SET ticket_generated = 1, ticket_pdf_path = ?, updated_at = datetime('now') WHERE id = ?",
      [pdfPath, reg.id]
    );
  }

  // Prepare email content
  const vars = {
    first_name: reg.first_name,
    last_name: reg.last_name,
    event_name: event.name,
    ticket_number: reg.ticket_number,
    guests_count: guestList.length,
    event_date: event.event_date,
    event_time: event.event_time,
    location: event.location,
    organizer_name: event.organizer_name
  };

  const subject = renderTemplate(event.email_subject || 'Bileta juaj zyrtare – {event_name}', vars);
  const bodyText = renderTemplate(event.email_body, vars);
  const htmlContent = buildHtmlEmail({
    recipientName: `${reg.first_name} ${reg.last_name}`,
    eventName: event.name,
    ticketNumber: reg.ticket_number,
    eventDate: event.event_date,
    eventTime: event.event_time,
    location: event.location,
    organizerName: event.organizer_name,
    guestsCount: guestList.length,
    customBody: bodyText
  });

  const fromAddress = process.env.SMTP_FROM || queryOne("SELECT value FROM system_settings WHERE key = 'smtp_from'")?.value || 'biletat@uni-pr.edu';

  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: `"Fakulteti i Mjekësisë - UP" <${fromAddress}>`,
      to: reg.email,
      subject,
      text: bodyText,
      html: htmlContent,
      attachments: [
        {
          filename: `Bileta-Zyrtare-${reg.ticket_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email delivered successfully to ${reg.email}. Message ID: ${info.messageId}`);

    // Update database status
    execute(
      `UPDATE registrations 
       SET email_status = 'sent', email_sent_at = datetime('now'), email_error = NULL, updated_at = datetime('now') 
       WHERE id = ?`,
      [reg.id]
    );

    return {
      success: true,
      messageId: info.messageId,
      email: reg.email,
      ticketNumber: reg.ticket_number
    };
  } catch (err) {
    console.error(`✕ Email delivery failed for ${reg.email}:`, err.message);

    // Update database with failure record
    execute(
      `UPDATE registrations 
       SET email_status = 'failed', email_error = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      [err.message, reg.id]
    );

    return {
      success: false,
      error: err.message,
      email: reg.email
    };
  }
}

/**
 * Retry all failed emails for an event
 */
async function retryFailedEmails(eventId, baseUrl) {
  const failedRegistrations = queryAll(
    "SELECT id FROM registrations WHERE event_id = ? AND email_status = 'failed'",
    [eventId]
  );

  const results = [];
  for (const reg of failedRegistrations) {
    const res = await sendTicketEmail(reg.id, { baseUrl });
    results.push(res);
  }

  return results;
}

module.exports = {
  getTransporter,
  sendTicketEmail,
  retryFailedEmails,
  buildHtmlEmail,
  renderTemplate
};
