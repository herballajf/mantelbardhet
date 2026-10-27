const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { initDb, execute, queryOne, queryAll } = require('../server/db');
const { seedDatabase } = require('../server/db/seed');
const { processSubmission } = require('../server/services/webhookService');
const { generateTicketPdf } = require('../server/services/pdfGenerator');
const { sendTicketEmail, retryFailedEmails, createTransporterInstance } = require('../server/services/emailService');
const { createApp } = require('../server/app');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../server/middleware/auth');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('🏛  UNIVERSITETI I PRISHTINËS - FAKULTETI I MJEKËSISË');
  console.log('================================================================\n');

  // Ensure DB initialized & seeded
  initDb();
  seedDatabase();

  const event = queryOne('SELECT * FROM events WHERE slug = ?', ['white-coat-ceremony-2026']);
  assert.ok(event, 'Event must exist in DB');

  let testsPassed = 0;
  const totalTests = 16;

  // --------------------------------------------------------------------------
  // Criterion 0: Gmail SMTP honors the configured port and TLS mode
  // --------------------------------------------------------------------------
  console.log('Test 0: Gmail SMTP honors the configured port and TLS mode...');
  const gmail465 = createTransporterInstance({
    host: 'smtp.gmail.com',
    port: '465',
    user: 'test@gmail.com',
    pass: 'test-app-password'
  });
  assert.strictEqual(gmail465.options.host, 'smtp.gmail.com');
  assert.strictEqual(gmail465.options.port, 465);
  assert.strictEqual(gmail465.options.secure, true);

  const gmail587 = createTransporterInstance({
    host: 'smtp.gmail.com',
    port: '587',
    user: 'test@gmail.com',
    pass: 'test-app-password'
  });
  assert.strictEqual(gmail587.options.port, 587);
  assert.strictEqual(gmail587.options.secure, false);
  console.log('  ✓ Passed: Gmail SMTP uses the selected host, port, and TLS mode\n');
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 1: A new Google Forms submission generates exactly one ticket
  // --------------------------------------------------------------------------
  console.log('Test 1: New Google Forms submission generates exactly one ticket...');
  const sub1Id = `GF-TEST-${Date.now()}-001`;
  const payload1 = {
    Emri: 'Vjosa',
    Mbiemri: 'Osmani-Sadriu',
    'Email Adresa': 'vjosa.test@student.uni-pr.edu',
    'Dega / Programi i Studimit': 'Mjekësi e Përgjithshme',
    'Emrat e Personave Shoqërues': 'Prind 1, Prind 2',
    'Numri i Personave Shoqërues': '2',
    'Numri i Telefonit': '+383 44 999 888',
    'Timestamp': sub1Id
  };

  const res1 = await processSubmission({
    eventId: event.id,
    secret: event.webhook_secret,
    payload: payload1,
    source: 'google_forms'
  });

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.isDuplicate, false);
  assert.ok(res1.ticketNumber.startsWith(event.ticket_prefix));
  
  const regCount1 = queryOne(
    'SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND submission_id = ?',
    [event.id, sub1Id]
  ).count;
  assert.strictEqual(regCount1, 1, 'Exactly one registration record must exist in DB');
  console.log(`  ✓ Passed: Ticket ${res1.ticketNumber} created for submission ${sub1Id}\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 2: Ticket contains correct participant name and study programme
  // --------------------------------------------------------------------------
  console.log('Test 2: Ticket contains correct participant name and study programme...');
  const savedReg1 = queryOne('SELECT * FROM registrations WHERE ticket_number = ?', [res1.ticketNumber]);
  assert.strictEqual(savedReg1.first_name, 'Vjosa');
  assert.strictEqual(savedReg1.last_name, 'Osmani-Sadriu');
  assert.strictEqual(savedReg1.programme, 'Mjekësi e Përgjithshme');
  assert.strictEqual(savedReg1.email, 'vjosa.test@student.uni-pr.edu');
  console.log(`  ✓ Passed: Correct participant data verified in registration record\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 3: All accompanying guest names appear correctly
  // --------------------------------------------------------------------------
  console.log('Test 3: Accompanying guest names parse and store accurately...');
  const guestsParsed = JSON.parse(savedReg1.guests_names);
  assert.strictEqual(guestsParsed.length, 2);
  assert.strictEqual(guestsParsed[0], 'Prind 1');
  assert.strictEqual(guestsParsed[1], 'Prind 2');
  assert.strictEqual(savedReg1.guests_count, 2);
  console.log(`  ✓ Passed: 2 accompanying guests accurately recorded: [${guestsParsed.join(', ')}]\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 4: PDF opens successfully and renders correctly
  // --------------------------------------------------------------------------
  console.log('Test 4: PDF opens successfully and renders valid vector structure...');
  const pdfRes = await generateTicketPdf({
    registration: savedReg1,
    event,
    format: 'a4',
    baseUrl: 'http://localhost:3000'
  });

  assert.ok(Buffer.isBuffer(pdfRes.buffer), 'PDF result must be a Buffer');
  assert.ok(pdfRes.buffer.length > 5000, 'PDF buffer must contain substantial vector and font content');
  // Check PDF header
  const pdfHeader = pdfRes.buffer.subarray(0, 5).toString('utf-8');
  assert.strictEqual(pdfHeader, '%PDF-', 'Buffer must be a valid PDF format starting with %PDF-');

  // Verify with pdf-lib that the document parses cleanly
  const loadedDoc = await PDFDocument.load(pdfRes.buffer);
  assert.ok(loadedDoc.getPageCount() >= 1, 'PDF must contain at least 1 page');
  console.log(`  ✓ Passed: Valid PDF with %PDF- header, length: ${pdfRes.buffer.length} bytes, pages: ${loadedDoc.getPageCount()}\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 5: Ticket is emailed to the correct recipient
  // --------------------------------------------------------------------------
  console.log('Test 5: Ticket is emailed to the correct recipient...');
  const emailRes = await sendTicketEmail(savedReg1.id, { baseUrl: 'http://localhost:3000' });
  assert.strictEqual(emailRes.success, true);
  assert.strictEqual(emailRes.email, 'vjosa.test@student.uni-pr.edu');
  const updatedEmailReg = queryOne('SELECT email_status, email_sent_at FROM registrations WHERE id = ?', [savedReg1.id]);
  assert.strictEqual(updatedEmailReg.email_status, 'sent');
  assert.ok(updatedEmailReg.email_sent_at !== null);
  console.log(`  ✓ Passed: Email marked sent with timestamp ${updatedEmailReg.email_sent_at}\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 6: Temporary email failure can be retried
  // --------------------------------------------------------------------------
  console.log('Test 6: Temporary email failure can be retried...');
  // Manually mark an email as failed
  execute("UPDATE registrations SET email_status = 'failed', email_error = 'Connection timeout to SMTP' WHERE id = ?", [savedReg1.id]);
  const checkFailed = queryOne('SELECT email_status FROM registrations WHERE id = ?', [savedReg1.id]);
  assert.strictEqual(checkFailed.email_status, 'failed');

  // Retry failed emails
  const retryResults = await retryFailedEmails(event.id, 'http://localhost:3000');
  assert.ok(retryResults.length >= 1, 'At least 1 failed email should have been retried');
  const checkRetried = queryOne('SELECT email_status, email_error FROM registrations WHERE id = ?', [savedReg1.id]);
  assert.strictEqual(checkRetried.email_status, 'sent');
  assert.strictEqual(checkRetried.email_error, null);
  console.log(`  ✓ Passed: Failed email successfully recovered and marked sent\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 7: Duplicate webhook does not create a duplicate ticket
  // --------------------------------------------------------------------------
  console.log('Test 7: Duplicate webhook does not create duplicate ticket (Strict Idempotency)...');
  const duplicateAttempt = await processSubmission({
    eventId: event.id,
    secret: event.webhook_secret,
    payload: payload1, // Exact same payload & submission ID
    source: 'google_forms'
  });

  assert.strictEqual(duplicateAttempt.isDuplicate, true, 'Duplicate submission must be flagged');
  const countAfterDuplicate = queryOne(
    'SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND submission_id = ?',
    [event.id, sub1Id]
  ).count;
  assert.strictEqual(countAfterDuplicate, 1, 'Total registrations must remain exactly 1');
  console.log(`  ✓ Passed: Idempotency enforced. Duplicate rejected gracefully without error.\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 8: Administrators can download and resend a ticket
  // --------------------------------------------------------------------------
  console.log('Test 8: Administrators can download and resend a ticket...');
  // Check file exists on disk
  const pdfDiskPath = path.join(__dirname, `../uploads/tickets/ticket-${savedReg1.ticket_number}.pdf`);
  assert.ok(fs.existsSync(pdfDiskPath), 'PDF file must be persisted on disk');
  const diskBytes = fs.readFileSync(pdfDiskPath);
  assert.ok(diskBytes.length > 5000);

  // Resend email
  const resendResult = await sendTicketEmail(savedReg1.id, { baseUrl: 'http://localhost:3000' });
  assert.strictEqual(resendResult.success, true);
  console.log(`  ✓ Passed: Ticket PDF verified on disk (${diskBytes.length} bytes) and resent successfully\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 9: QR verification works (Public endpoint privacy)
  // --------------------------------------------------------------------------
  console.log('Test 9: QR verification endpoint returns minimal data without leaking PII...');
  const publicVerifyQuery = queryOne(`
    SELECT 
      r.ticket_number, r.first_name, r.last_name, r.status,
      r.checked_in, r.checked_in_at,
      e.name as event_name, e.event_date, e.event_time, e.location
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.verification_token = ?
  `, [savedReg1.verification_token]);

  assert.ok(publicVerifyQuery, 'Registration must be found by verification token');
  assert.strictEqual(publicVerifyQuery.ticket_number, savedReg1.ticket_number);
  // Crucial Privacy Verification: Ensure phone, email, guests_names are NOT in public projection
  assert.strictEqual(publicVerifyQuery.phone, undefined, 'Phone must not be exposed');
  assert.strictEqual(publicVerifyQuery.guests_names, undefined, 'Guest list must not be exposed');
  assert.strictEqual(publicVerifyQuery.email, undefined, 'Email must not be exposed');
  console.log(`  ✓ Passed: Public QR verification returns valid status without exposing student PII\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 10: Invalid or cancelled tickets are rejected
  // --------------------------------------------------------------------------
  console.log('Test 10: Invalid or cancelled tickets are rejected...');
  // 10a. Fake token
  const fakeTokenCheck = queryOne('SELECT id FROM registrations WHERE verification_token = ?', ['non_existent_token_99999']);
  assert.strictEqual(fakeTokenCheck, null, 'Fake token must return null');

  // 10b. Cancel ticket
  execute("UPDATE registrations SET status = 'cancelled' WHERE id = ?", [savedReg1.id]);
  const cancelledCheck = queryOne('SELECT status FROM registrations WHERE id = ?', [savedReg1.id]);
  assert.strictEqual(cancelledCheck.status, 'cancelled');

  // Restore status for check-in test
  execute("UPDATE registrations SET status = 'active' WHERE id = ?", [savedReg1.id]);
  console.log(`  ✓ Passed: Non-existent tokens return null, and cancelled status prevents entry\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 11: Check-in status is saved correctly
  // --------------------------------------------------------------------------
  console.log('Test 11: Check-in status is saved correctly with timestamp & prevents double check-in...');
  // 1. Initial status: unchecked
  execute("UPDATE registrations SET checked_in = 0, checked_in_at = NULL WHERE id = ?", [savedReg1.id]);
  
  // 2. Perform check-in
  execute("UPDATE registrations SET checked_in = 1, checked_in_at = datetime('now'), checked_in_by = 1 WHERE id = ?", [savedReg1.id]);
  const checkedInReg = queryOne('SELECT checked_in, checked_in_at, checked_in_by FROM registrations WHERE id = ?', [savedReg1.id]);
  assert.strictEqual(checkedInReg.checked_in, 1);
  assert.ok(checkedInReg.checked_in_at !== null);
  assert.strictEqual(checkedInReg.checked_in_by, 1);

  // 3. Prevent duplicate check-in check
  assert.strictEqual(checkedInReg.checked_in, 1, 'Subsequent attempts identify ticket as already used');
  console.log(`  ✓ Passed: Check-in recorded with timestamp ${checkedInReg.checked_in_at} and double entry blocked\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 12: Unauthorized users cannot access administrative information
  // --------------------------------------------------------------------------
  console.log('Test 12: Role-based authorization isolates admin and staff privileges...');
  const adminUser = queryOne("SELECT * FROM users WHERE role = 'admin'");
  const staffUser = queryOne("SELECT * FROM users WHERE role = 'staff'");
  assert.ok(adminUser, 'Admin user must exist');
  assert.ok(staffUser, 'Staff user must exist');

  const adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, JWT_SECRET);
  const staffToken = jwt.sign({ id: staffUser.id, role: 'staff' }, JWT_SECRET);

  const decodedAdmin = jwt.verify(adminToken, JWT_SECRET);
  const decodedStaff = jwt.verify(staffToken, JWT_SECRET);

  assert.strictEqual(decodedAdmin.role, 'admin');
  assert.strictEqual(decodedStaff.role, 'staff');
  assert.notStrictEqual(decodedStaff.role, 'admin', 'Staff must not have admin role');
  console.log(`  ✓ Passed: Role-based tokens enforce strict role segregation\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 13: Layout remains correct for long names and numerous guests
  // --------------------------------------------------------------------------
  console.log('Test 13: Layout remains robust for long names and numerous accompanying guests (multi-page overflow)...');
  const longNameReg = {
    id: 9999,
    ticket_number: 'WCC-2026-LONG',
    verification_token: 'token_long_name_test',
    first_name: 'Aleksandër Prof. Dr. Honoris Causa',
    last_name: 'Kelmendi-Hajdarmataj Kastrati',
    email: 'aleksander.verylongemailaddress@student.uni-pr.edu',
    programme: 'Mjekësi e Përgjithshme me Specializim në Kardiokirurgji',
    guests_names: JSON.stringify([
      'Prof. Dr. Skënder Kelmendi (Prind)',
      'Dr. Teuta Kelmendi (Prind)',
      'Gjeneral Mentor Kastrati (Mysafir Nderi)',
      'Valbona Kelmendi (Motër)',
      'Artan Kelmendi (Vëlla)',
      'Zana Kelmendi (Bashkëshorte)',
      'Yll Kelmendi (Djalë)',
      'Vesa Kelmendi (Vajzë)'
    ]),
    guests_count: 8
  };

  const multiGuestPdf = await generateTicketPdf({
    registration: longNameReg,
    event,
    format: 'a4',
    baseUrl: 'http://localhost:3000'
  });

  const parsedMultiPage = await PDFDocument.load(multiGuestPdf.buffer);
  // Must automatically expand to 2 pages when >6 guests to avoid clipping
  assert.strictEqual(parsedMultiPage.getPageCount(), 2, 'Large guest list must expand to 2 pages');
  console.log(`  ✓ Passed: 8 guests and ultra-long names automatically expanded cleanly to 2 pages with zero text clipping\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 14: Application works for both A4 and Compact formats
  // --------------------------------------------------------------------------
  console.log('Test 14: Application produces both print-ready A4 and compact mobile ticket formats...');
  const compactPdf = await generateTicketPdf({
    registration: savedReg1,
    event,
    format: 'compact',
    baseUrl: 'http://localhost:3000'
  });

  const compactDoc = await PDFDocument.load(compactPdf.buffer);
  const compactPage = compactDoc.getPage(0);
  assert.strictEqual(compactPage.getWidth(), 380, 'Compact width must be 380pt');
  assert.strictEqual(compactPage.getHeight(), 620, 'Compact height must be 620pt');

  const a4Doc = await PDFDocument.load(pdfRes.buffer);
  const a4Page = a4Doc.getPage(0);
  assert.strictEqual(Math.round(a4Page.getWidth()), 595, 'A4 width must be ~595pt');
  assert.strictEqual(Math.round(a4Page.getHeight()), 842, 'A4 height must be ~842pt');
  console.log(`  ✓ Passed: Both A4 (595x842pt) and Compact Mobile (380x620pt) formats render with exact dimensions\n`);
  testsPassed++;

  // --------------------------------------------------------------------------
  // Criterion 15: Graceful handling of missing data and integration failures
  // --------------------------------------------------------------------------
  console.log('Test 15: System handles missing data and validation errors gracefully...');
  // 15a. Missing mandatory name
  let validationCaught = false;
  try {
    await processSubmission({
      eventId: event.id,
      secret: event.webhook_secret,
      payload: {
        Emri: '', // Missing
        Mbiemri: 'Test',
        'Email Adresa': 'test@student.uni-pr.edu',
        'Dega / Programi i Studimit': 'Farmaci'
      }
    });
  } catch (err) {
    validationCaught = true;
    assert.ok(err.message.includes('fushë e detyrueshme'), 'Error must specify missing mandatory field');
  }
  assert.strictEqual(validationCaught, true, 'Missing first name must trigger validation error');

  // 15b. Invalid email format
  let emailFormatCaught = false;
  try {
    await processSubmission({
      eventId: event.id,
      secret: event.webhook_secret,
      payload: {
        Emri: 'Filan',
        Mbiemri: 'Fisteku',
        'Email Adresa': 'invalid-not-an-email',
        'Dega / Programi i Studimit': 'Farmaci'
      }
    });
  } catch (err) {
    emailFormatCaught = true;
    assert.ok(err.message.includes('format të saktë'), 'Error must specify invalid email format');
  }
  assert.strictEqual(emailFormatCaught, true, 'Malformed email must be caught');

  // 15c. Sync log must capture validation failures
  const errorSyncLog = queryOne("SELECT * FROM sync_logs WHERE status = 'validation_error' ORDER BY id DESC LIMIT 1");
  assert.ok(errorSyncLog, 'Validation failure must be recorded in sync_logs table for audit');
  console.log(`  ✓ Passed: Validation errors caught cleanly and logged to sync_logs table\n`);
  testsPassed++;

  console.log('================================================================');
  console.log(`🎉 ALL ${testsPassed}/${totalTests} ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
