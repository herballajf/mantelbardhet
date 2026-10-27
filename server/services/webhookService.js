const crypto = require('crypto');
const { queryOne, execute, transaction } = require('../db');
const { generateTicketPdf } = require('./pdfGenerator');
const { sendTicketEmail } = require('./emailService');

/**
 * Clean & Parse Accompanying Guests
 */
function parseGuests(rawGuests, rawCount) {
  let list = [];

  if (Array.isArray(rawGuests)) {
    list = rawGuests.map(g => String(g).trim()).filter(Boolean);
  } else if (typeof rawGuests === 'string' && rawGuests.trim()) {
    // Check if JSON array string
    if (rawGuests.trim().startsWith('[') && rawGuests.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(rawGuests);
        if (Array.isArray(parsed)) {
          list = parsed.map(g => String(g).trim()).filter(Boolean);
        }
      } catch (e) {
        // Fall back to delimiters
      }
    }

    if (list.length === 0) {
      // Split by newlines, semicolons, or commas
      const rawLines = rawGuests.split(/[\r\n;]+/).map(g => g.trim()).filter(Boolean);
      for (const line of rawLines) {
        // Remove leading numbers like "1. ", "1) ", "- "
        const cleaned = line.replace(/^\s*(\d+[\.\)]|-|\*)\s*/, '').trim();
        if (cleaned) {
          // If a single line contains comma-separated names
          if (cleaned.includes(',') && !cleaned.includes('(')) {
            cleaned.split(',').forEach(sub => {
              const subClean = sub.trim();
              if (subClean) list.push(subClean);
            });
          } else {
            list.push(cleaned);
          }
        }
      }
    }
  }

  const count = !isNaN(parseInt(rawCount, 10)) && parseInt(rawCount, 10) >= 0
    ? Math.max(parseInt(rawCount, 10), list.length)
    : list.length;

  return { guestList: list, guestCount: count };
}

/**
 * Generate Next Unique Ticket Number
 */
function generateNextTicketNumber(event) {
  const prefix = event.ticket_prefix || 'MED';
  const year = new Date().getFullYear();

  // Find max ticket sequence for this event
  const lastReg = queryOne(
    `SELECT ticket_number FROM registrations 
     WHERE event_id = ? AND ticket_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [event.id, `${prefix}-${year}-%`]
  );

  let nextSeq = 101; // Start at 101 for prestigious numbering
  if (lastReg && lastReg.ticket_number) {
    const parts = lastReg.ticket_number.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`;
}

/**
 * Process incoming Google Form / Sheets submission
 */
async function processSubmission({ eventId, eventSlug, payload, secret, source = 'google_forms', baseUrl = 'http://localhost:3000' }) {
  // 1. Resolve Event
  let event;
  if (eventId) {
    event = queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
  } else if (eventSlug) {
    event = queryOne('SELECT * FROM events WHERE slug = ?', [eventSlug]);
  } else if (secret) {
    event = queryOne('SELECT * FROM events WHERE webhook_secret = ?', [secret]);
  }

  if (!event) {
    throw new Error('Aktiviteti (Event) nuk u gjet ose nuk ekziston.');
  }

  // 2. Validate Webhook Secret
  const incomingSecret = secret || payload?.secret || payload?.webhook_secret;
  if (event.webhook_secret && incomingSecret !== event.webhook_secret) {
    // Record security log
    execute(
      `INSERT INTO sync_logs (event_id, source, status, payload, message)
       VALUES (?, ?, 'processing_error', ?, 'Gabim autentikimi: Webhook secret i pasakte')`,
      [event.id, source, JSON.stringify(payload || {})]
    );
    throw new Error('Sekreti i webhook nuk përputhet (Unauthorized webhook secret).');
  }

  // 3. Map Fields
  let mapping = {};
  try {
    mapping = typeof event.field_mapping === 'string' ? JSON.parse(event.field_mapping) : (event.field_mapping || {});
  } catch (e) {
    mapping = {};
  }

  // Extract from Google Form structure or raw key-value
  const data = payload?.data || payload?.namedValues || payload?.values || payload;

  const getMappedValue = (targetKey, fallbackKeys = []) => {
    // Check custom mapping first
    const mappedHeader = mapping[targetKey];
    if (mappedHeader && data[mappedHeader] !== undefined) {
      const val = data[mappedHeader];
      return Array.isArray(val) ? val[0] : val;
    }
    // Check fallback aliases
    const candidates = [targetKey, ...fallbackKeys];
    for (const k of candidates) {
      if (data[k] !== undefined) {
        const val = data[k];
        return Array.isArray(val) ? val[0] : val;
      }
      // Case-insensitive lookup
      const foundKey = Object.keys(data).find(key => key.trim().toLowerCase() === k.trim().toLowerCase());
      if (foundKey && data[foundKey] !== undefined) {
        const val = data[foundKey];
        return Array.isArray(val) ? val[0] : val;
      }
    }
    return '';
  };

  const rawFirstName = getMappedValue('first_name', ['emri', 'first name', 'firstname']);
  const rawLastName = getMappedValue('last_name', ['mbiemri', 'last name', 'lastname']);
  const rawEmail = getMappedValue('email', ['email adresa', 'email address', 'e-mail', 'posta elektronike']);
  const rawProg = getMappedValue('programme', ['dega', 'programi', 'study programme', 'department', 'departamenti']);
  const rawPhone = getMappedValue('phone', ['telefoni', 'nr telefoni', 'numri i telefonit', 'phone number', 'tel']);
  const rawGuests = getMappedValue('guests_names', ['personat shoqerues', 'emrat e shoqeruesve', 'mysafiret', 'guests', 'accompanying guests']);
  const rawGuestsCount = getMappedValue('guests_count', ['numri i personave shoqerues', 'numri i shoqeruesve', 'guest count', 'guests count']);
  const rawNotes = getMappedValue('notes', ['shenime', 'informata shtese', 'notes', 'comments']);
  
  // Submission identifier for deduplication
  const rawSubId = getMappedValue('submission_id', ['response_id', 'id', 'timestamp', 'koha e regjistrimit', 'row_id']);
  const submissionId = String(rawSubId || payload?.id || `SUB-${Date.now()}-${Math.random().toString(36).substring(7)}`).trim();

  // 4. Validate Mandatory Fields
  const errors = [];
  if (!rawFirstName || !rawFirstName.trim()) errors.push('Emri është fushë e detyrueshme.');
  if (!rawLastName || !rawLastName.trim()) errors.push('Mbiemri është fushë e detyrueshme.');
  if (!rawEmail || !rawEmail.trim()) {
    errors.push('Email adresa është fushë e detyrueshme.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
    errors.push(`Email adresa "${rawEmail.trim()}" nuk është në format të saktë.`);
  }
  if (!rawProg || !rawProg.trim()) errors.push('Programi/Dega e studimit është fushë e detyrueshme.');

  if (errors.length > 0) {
    execute(
      `INSERT INTO sync_logs (event_id, submission_id, source, status, payload, message)
       VALUES (?, ?, ?, 'validation_error', ?, ?)`,
      [event.id, submissionId, source, JSON.stringify(payload), errors.join(' ')]
    );
    throw new Error(`Validimi dështoi: ${errors.join(', ')}`);
  }

  // 5. Idempotency Check: Prevent duplicate tickets for same submission ID
  const existingReg = queryOne(
    'SELECT * FROM registrations WHERE event_id = ? AND submission_id = ?',
    [event.id, submissionId]
  );

  if (existingReg) {
    execute(
      `INSERT INTO sync_logs (event_id, submission_id, source, status, payload, message)
       VALUES (?, ?, ?, 'duplicate', ?, 'Regjistrimi tashmë ekziston. U parandalua dublimi i biletës.')`,
      [event.id, submissionId, source, JSON.stringify(payload)]
    );

    return {
      success: true,
      isDuplicate: true,
      message: 'Regjistrimi tashmë ekziston në sistem. Asnjë biletë e dyfishtë nuk u krijua.',
      registration: existingReg
    };
  }

  // 6. Parse guests
  const { guestList, guestCount } = parseGuests(rawGuests, rawGuestsCount);

  // 7. Generate Ticket Number & Verification Token
  const ticketNumber = generateNextTicketNumber(event);
  const verificationToken = crypto.randomBytes(16).toString('hex');

  const firstName = rawFirstName.trim();
  const lastName = rawLastName.trim();
  const email = rawEmail.trim().toLowerCase();
  const programme = rawProg.trim();
  const phone = rawPhone ? rawPhone.trim() : null;
  const notes = rawNotes ? rawNotes.trim() : null;

  // 8. Insert into Database inside Transaction
  let newRegId;
  transaction(() => {
    const res = execute(
      `INSERT INTO registrations (
        event_id, submission_id, ticket_number, verification_token,
        first_name, last_name, email, programme, phone,
        guests_count, guests_names, notes, status,
        ticket_generated, email_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 'queued')`,
      [
        event.id, submissionId, ticketNumber, verificationToken,
        firstName, lastName, email, programme, phone,
        guestCount, JSON.stringify(guestList), notes
      ]
    );
    newRegId = Number(res.lastInsertRowid);

    // Record success log
    execute(
      `INSERT INTO sync_logs (event_id, submission_id, source, status, payload, message)
       VALUES (?, ?, ?, 'success', ?, ?)`,
      [event.id, submissionId, source, JSON.stringify(payload), `U gjenerua me sukses bileta ${ticketNumber} per ${firstName} ${lastName}`]
    );
  });

  const createdReg = queryOne('SELECT * FROM registrations WHERE id = ?', [newRegId]);

  // 9. Automated PDF & Email Delivery (if auto_generate_tickets is enabled)
  let emailResult = null;
  let pdfResult = null;

  if (event.auto_generate_tickets) {
    try {
      // Generate PDF
      pdfResult = await generateTicketPdf({
        registration: createdReg,
        event,
        format: event.ticket_format || 'a4',
        baseUrl
      });

      execute(
        "UPDATE registrations SET ticket_generated = 1, ticket_pdf_path = ?, updated_at = datetime('now') WHERE id = ?",
        [pdfResult.filePath, newRegId]
      );

      // Send Email
      emailResult = await sendTicketEmail(newRegId, { baseUrl });
    } catch (deliveryErr) {
      console.error('Error during automatic PDF/Email processing:', deliveryErr);
    }
  }

  const updatedReg = queryOne('SELECT * FROM registrations WHERE id = ?', [newRegId]);

  return {
    success: true,
    isDuplicate: false,
    registration: updatedReg,
    ticketNumber,
    pdfGenerated: !!pdfResult,
    emailSent: emailResult?.success || false
  };
}

module.exports = {
  processSubmission,
  parseGuests,
  generateNextTicketNumber
};
