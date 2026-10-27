const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Colors
const NAVY_DARK = rgb(11 / 255, 30 / 255, 54 / 255);       // #0B1E36
const NAVY_MED = rgb(20 / 255, 45 / 255, 80 / 255);        // #142D50
const NAVY_LIGHT = rgb(235 / 255, 241 / 255, 250 / 255);   // #EBF1FA
const GOLD = rgb(197 / 255, 160 / 255, 89 / 255);          // #C5A059
const GOLD_LIGHT = rgb(245 / 255, 238 / 255, 220 / 255);   // #F5EEDC
const WHITE = rgb(1, 1, 1);
const SLATE_DARK = rgb(51 / 255, 65 / 255, 85 / 255);      // #334155
const SLATE_MED = rgb(100 / 255, 116 / 255, 139 / 255);    // #64748B
const SLATE_LIGHT = rgb(241 / 255, 245 / 255, 249 / 255);  // #F1F5F9
const BORDER_COLOR = rgb(215 / 255, 222 / 255, 232 / 255);

// Sanitize string for WinAnsi standard font encoding
function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–/g, '-')
    .replace(/—/g, '--')
    .replace(/\u2022/g, '*')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// Generate QR Code buffer (High resolution 600x600 for sharp vector embedding)
async function generateQrBuffer(text) {
  return await QRCode.toBuffer(text, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 1,
    width: 600,
    color: {
      dark: '#0B1E36',
      light: '#FFFFFF'
    }
  });
}

// Draw ornate vector corner accents
function drawOrnateCorners(page, x, y, width, height, color) {
  const arm = 14;
  const t = 1.2;

  // Top-Left
  page.drawLine({ start: { x, y: y + height }, end: { x: x + arm, y: y + height }, thickness: t, color });
  page.drawLine({ start: { x, y: y + height }, end: { x, y: y + height - arm }, thickness: t, color });
  page.drawCircle({ x: x + 4, y: y + height - 4, size: 1.5, color });

  // Top-Right
  page.drawLine({ start: { x: x + width, y: y + height }, end: { x: x + width - arm, y: y + height }, thickness: t, color });
  page.drawLine({ start: { x: x + width, y: y + height }, end: { x: x + width, y: y + height - arm }, thickness: t, color });
  page.drawCircle({ x: x + width - 4, y: y + height - 4, size: 1.5, color });

  // Bottom-Left
  page.drawLine({ start: { x, y }, end: { x: x + arm, y }, thickness: t, color });
  page.drawLine({ start: { x, y }, end: { x, y: y + arm }, thickness: t, color });
  page.drawCircle({ x: x + 4, y: y + 4, size: 1.5, color });

  // Bottom-Right
  page.drawLine({ start: { x: x + width, y }, end: { x: x + width - arm, y }, thickness: t, color });
  page.drawLine({ start: { x: x + width, y }, end: { x: x + width, y: y + arm }, thickness: t, color });
  page.drawCircle({ x: x + width - 4, y: y + 4, size: 1.5, color });
}

// Draw academic seal & Rod of Asclepius vector emblem
function drawMedicalSeal(page, cx, cy, radius, primaryColor, secondaryColor) {
  // Outer rings
  page.drawCircle({ x: cx, y: cy, size: radius, borderColor: secondaryColor, borderWidth: 1.5 });
  page.drawCircle({ x: cx, y: cy, size: radius - 3.5, borderColor: primaryColor, borderWidth: 0.8 });

  // Inner shaded ring
  page.drawCircle({ x: cx, y: cy, size: radius - 7, borderColor: secondaryColor, borderWidth: 0.8 });

  // Rod of Asclepius (Staff and coiled serpent)
  const staffHeight = radius * 1.1;
  page.drawLine({
    start: { x: cx, y: cy - staffHeight / 2 },
    end: { x: cx, y: cy + staffHeight / 2 },
    thickness: 2.2,
    color: primaryColor
  });

  // Staff golden finial (top knob)
  page.drawCircle({ x: cx, y: cy + staffHeight / 2 + 1.5, size: 2.5, color: secondaryColor });

  // Coiled snake (artistic arcs / lines)
  page.drawCircle({ x: cx - 4, y: cy + 4, size: 3.5, borderColor: secondaryColor, borderWidth: 1.4 });
  page.drawCircle({ x: cx + 4, y: cy - 4, size: 3.5, borderColor: secondaryColor, borderWidth: 1.4 });
  page.drawCircle({ x: cx - 3, y: cy - 10, size: 2.5, borderColor: secondaryColor, borderWidth: 1.2 });
}

/**
 * Format 1: Print-Ready Institutional A4 Invitation & Ticket
 * (595.28 x 841.89 pt - Standard ISO A4)
 */
async function generateA4Ticket(registration, event, baseUrl) {
  const pdfDoc = await PDFDocument.create();
  
  // Standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const verificationUrl = `${baseUrl.replace(/\/$/, '')}/verify/${registration.verification_token}`;
  const qrBuffer = await generateQrBuffer(verificationUrl);
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  // Parse guests
  let guestList = [];
  try {
    if (typeof registration.guests_names === 'string') {
      guestList = JSON.parse(registration.guests_names);
    } else if (Array.isArray(registration.guests_names)) {
      guestList = registration.guests_names;
    }
  } catch (e) {
    if (registration.guests_names) {
      guestList = [registration.guests_names];
    }
  }

  // Create First Page
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Background tint
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.985, 0.988, 0.992)
  });

  // Double Border Frame (Institutional elegance)
  const m = 26; // Margin
  page.drawRectangle({
    x: m,
    y: m,
    width: width - m * 2,
    height: height - m * 2,
    borderColor: GOLD,
    borderWidth: 1.5
  });

  page.drawRectangle({
    x: m + 5,
    y: m + 5,
    width: width - (m + 5) * 2,
    height: height - (m + 5) * 2,
    borderColor: NAVY_MED,
    borderWidth: 0.75
  });

  // Corner ornaments
  drawOrnateCorners(page, m + 7, m + 7, width - (m + 7) * 2, height - (m + 7) * 2, GOLD);

  // Top Institutional Header Ribbon
  const headerTop = height - m - 12;
  
  // Draw Medical Crest Emblem
  drawMedicalSeal(page, 75, headerTop - 36, 26, NAVY_DARK, GOLD);

  // Institution Texts
  const titleX = 115;
  page.drawText('UNIVERSITETI I PRISHTINES', {
    x: titleX,
    y: headerTop - 18,
    size: 15,
    font: fontTimesBold,
    color: NAVY_DARK
  });

  page.drawText('FAKULTETI I MJEKESISE', {
    x: titleX,
    y: headerTop - 34,
    size: 13,
    font: fontTimesBold,
    color: GOLD
  });

  if (event.is_ksfm_event) {
    page.drawText('KESHILLI I STUDENTEVE TE FAKULTETIT TE MJEKESISE (KSFM)', {
      x: titleX,
      y: headerTop - 48,
      size: 8.5,
      font: fontRegular,
      color: SLATE_MED
    });
  }

  // Right-aligned verification badge in header
  const badgeWidth = 120;
  const badgeX = width - m - badgeWidth - 16;
  page.drawRectangle({
    x: badgeX,
    y: headerTop - 44,
    width: badgeWidth,
    height: 32,
    color: NAVY_LIGHT,
    borderColor: GOLD,
    borderWidth: 1
  });
  page.drawText('DOKUMENT ZYRTAR', {
    x: badgeX + 16,
    y: headerTop - 25,
    size: 8,
    font: fontBold,
    color: NAVY_DARK
  });
  page.drawText(sanitizeText(registration.ticket_number), {
    x: badgeX + 14,
    y: headerTop - 38,
    size: 10,
    font: fontBold,
    color: GOLD
  });

  // Divider Line
  page.drawLine({
    start: { x: m + 15, y: headerTop - 64 },
    end: { x: width - m - 15, y: headerTop - 64 },
    thickness: 1,
    color: GOLD
  });

  // Event Banner Block
  let currentY = headerTop - 85;

  page.drawRectangle({
    x: m + 16,
    y: currentY - 55,
    width: width - (m + 16) * 2,
    height: 65,
    color: NAVY_DARK
  });

  // Gold accent bar on event banner
  page.drawRectangle({
    x: m + 16,
    y: currentY + 7,
    width: width - (m + 16) * 2,
    height: 3,
    color: GOLD
  });

  page.drawText('BILETE ZYRTARE HYRJEJE & FTESE SOLEMNE', {
    x: m + 32,
    y: currentY - 10,
    size: 9,
    font: fontBold,
    color: GOLD
  });

  const eventName = sanitizeText(event.name).toUpperCase();
  const eventNameSize = eventName.length > 40 ? 15 : 18;
  page.drawText(eventName, {
    x: m + 32,
    y: currentY - 32,
    size: eventNameSize,
    font: fontTimesBold,
    color: WHITE
  });

  if (event.description) {
    const desc = sanitizeText(event.description);
    const shortDesc = desc.length > 95 ? desc.substring(0, 92) + '...' : desc;
    page.drawText(shortDesc, {
      x: m + 32,
      y: currentY - 48,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.85, 0.9, 0.95)
    });
  }

  currentY -= 75;

  // Two-Column Section: Main Attendee (Left) & QR Code Security Card (Right)
  const leftColX = m + 16;
  const leftColWidth = 330;
  const rightColX = leftColX + leftColWidth + 14;
  const rightColWidth = width - (m + 16) - rightColX;

  // Participant Card Box
  page.drawRectangle({
    x: leftColX,
    y: currentY - 145,
    width: leftColWidth,
    height: 145,
    color: WHITE,
    borderColor: BORDER_COLOR,
    borderWidth: 1
  });

  // Top header of Participant Box
  page.drawRectangle({
    x: leftColX,
    y: currentY - 26,
    width: leftColWidth,
    height: 26,
    color: SLATE_LIGHT
  });

  page.drawText('TE DHENAT E PJESEMARRESIT KRYESOR', {
    x: leftColX + 14,
    y: currentY - 17,
    size: 8.5,
    font: fontBold,
    color: NAVY_DARK
  });

  const fullName = sanitizeText(`${registration.first_name} ${registration.last_name}`);
  page.drawText('Emri dhe Mbiemri:', {
    x: leftColX + 14,
    y: currentY - 44,
    size: 8.5,
    font: fontRegular,
    color: SLATE_MED
  });
  page.drawText(fullName, {
    x: leftColX + 14,
    y: currentY - 60,
    size: 15,
    font: fontBold,
    color: NAVY_DARK
  });

  page.drawText('Dega / Programi:', {
    x: leftColX + 14,
    y: currentY - 78,
    size: 8.5,
    font: fontRegular,
    color: SLATE_MED
  });
  page.drawText(sanitizeText(registration.programme), {
    x: leftColX + 14,
    y: currentY - 92,
    size: 11,
    font: fontBold,
    color: GOLD
  });

  page.drawText('Email:', {
    x: leftColX + 14,
    y: currentY - 110,
    size: 8,
    font: fontRegular,
    color: SLATE_MED
  });
  page.drawText(sanitizeText(registration.email), {
    x: leftColX + 14,
    y: currentY - 122,
    size: 9,
    font: fontRegular,
    color: SLATE_DARK
  });

  if (registration.phone) {
    page.drawText(`Tel: ${sanitizeText(registration.phone)}`, {
      x: leftColX + 180,
      y: currentY - 122,
      size: 9,
      font: fontRegular,
      color: SLATE_DARK
    });
  }

  // Right Column: QR Security Card
  page.drawRectangle({
    x: rightColX,
    y: currentY - 145,
    width: rightColWidth,
    height: 145,
    color: WHITE,
    borderColor: GOLD,
    borderWidth: 1.2
  });

  page.drawRectangle({
    x: rightColX,
    y: currentY - 24,
    width: rightColWidth,
    height: 24,
    color: NAVY_DARK
  });

  page.drawText('VERIFIKIMI ZYRTAR', {
    x: rightColX + 22,
    y: currentY - 16,
    size: 8,
    font: fontBold,
    color: GOLD
  });

  // Embed QR Image
  const qrSize = 88;
  const qrX = rightColX + (rightColWidth - qrSize) / 2;
  page.drawImage(qrImage, {
    x: qrX,
    y: currentY - 120,
    width: qrSize,
    height: qrSize
  });

  page.drawText('Skano per check-in', {
    x: rightColX + 25,
    y: currentY - 134,
    size: 7.5,
    font: fontBold,
    color: SLATE_MED
  });

  currentY -= 160;

  // Event Logistics Card (Date, Time, Location)
  page.drawRectangle({
    x: m + 16,
    y: currentY - 50,
    width: width - (m + 16) * 2,
    height: 50,
    color: NAVY_LIGHT,
    borderColor: BORDER_COLOR,
    borderWidth: 0.8
  });

  // 3 Mini Columns inside Logistics Card
  const boxWidthThird = (width - (m + 16) * 2) / 3;

  // Box 1: Date & Time
  page.drawText('DATA DHE ORA', {
    x: m + 28,
    y: currentY - 18,
    size: 8,
    font: fontBold,
    color: NAVY_MED
  });
  page.drawText(`${sanitizeText(event.event_date)} | ${sanitizeText(event.event_time)}`, {
    x: m + 28,
    y: currentY - 34,
    size: 11,
    font: fontBold,
    color: NAVY_DARK
  });

  // Box 2: Location
  const locX = m + 28 + boxWidthThird;
  page.drawText('VENDI / LOKACIONI', {
    x: locX,
    y: currentY - 18,
    size: 8,
    font: fontBold,
    color: NAVY_MED
  });
  const locText = sanitizeText(event.location);
  page.drawText(locText.length > 32 ? locText.substring(0, 30) + '...' : locText, {
    x: locX,
    y: currentY - 34,
    size: 10,
    font: fontBold,
    color: NAVY_DARK
  });

  // Box 3: Organizer
  const orgX = m + 28 + boxWidthThird * 2;
  page.drawText('ORGANIZATORI', {
    x: orgX,
    y: currentY - 18,
    size: 8,
    font: fontBold,
    color: NAVY_MED
  });
  const orgText = sanitizeText(event.organizer_name);
  page.drawText(orgText.length > 28 ? orgText.substring(0, 26) + '...' : orgText, {
    x: orgX,
    y: currentY - 34,
    size: 9.5,
    font: fontBold,
    color: NAVY_DARK
  });

  currentY -= 65;

  // Accompanying Guests Section (Crucial Requirement: 0, 1, 2, 3+ guests)
  const guestsBoxHeight = 150;
  page.drawRectangle({
    x: m + 16,
    y: currentY - guestsBoxHeight,
    width: width - (m + 16) * 2,
    height: guestsBoxHeight,
    color: WHITE,
    borderColor: BORDER_COLOR,
    borderWidth: 1
  });

  // Header of Guests Section
  page.drawRectangle({
    x: m + 16,
    y: currentY - 26,
    width: width - (m + 16) * 2,
    height: 26,
    color: SLATE_LIGHT
  });

  page.drawText('PERSONAT SHOQERUES TE REGJISTRUAR (ACCOMPANYING GUESTS)', {
    x: m + 28,
    y: currentY - 17,
    size: 8.5,
    font: fontBold,
    color: NAVY_DARK
  });

  const guestCount = guestList.length;
  page.drawText(`Numri i personave shoqerues: ${guestCount}`, {
    x: width - m - 200,
    y: currentY - 17,
    size: 8.5,
    font: fontBold,
    color: GOLD
  });

  let guestListY = currentY - 46;

  if (guestCount === 0) {
    page.drawText('Nuk ka persona shoqerues te regjistruar per kete pjesemarres.', {
      x: m + 32,
      y: guestListY - 10,
      size: 9.5,
      font: fontRegular,
      color: SLATE_MED
    });
    page.drawText('Kjo bilete vlen vetem per personin kryesor te shenuar me siper.', {
      x: m + 32,
      y: guestListY - 26,
      size: 8.5,
      font: fontRegular,
      color: SLATE_MED
    });
  } else {
    // Render guests cleanly. If up to 4 guests, single column or 2 columns
    const isMultiCol = guestCount > 3;
    const col1X = m + 32;
    const col2X = m + 32 + (width - (m + 16) * 2) / 2;

    guestList.slice(0, 6).forEach((guest, index) => {
      const colX = isMultiCol && index >= 3 ? col2X : col1X;
      const rowOffset = isMultiCol ? (index % 3) * 28 : index * 26;
      const targetY = guestListY - rowOffset;

      // Guest badge circle
      page.drawCircle({
        x: colX + 8,
        y: targetY + 3,
        size: 9,
        color: GOLD_LIGHT,
        borderColor: GOLD,
        borderWidth: 1
      });
      page.drawText(String(index + 1), {
        x: colX + (index + 1 >= 10 ? 4 : 6),
        y: targetY,
        size: 8,
        font: fontBold,
        color: NAVY_DARK
      });

      // Guest Name
      page.drawText(sanitizeText(guest), {
        x: colX + 26,
        y: targetY,
        size: 10,
        font: fontBold,
        color: SLATE_DARK
      });
    });

    if (guestCount > 6) {
      page.drawText(`Dhe ${guestCount - 6} mysafire te tjere te autorizuar (te listuar ne sistem)...`, {
        x: m + 32,
        y: guestListY - 105,
        size: 8.5,
        font: fontRegular,
        color: GOLD
      });
    }
  }

  currentY -= (guestsBoxHeight + 15);

  // Entry Instructions & Terms Section
  page.drawRectangle({
    x: m + 16,
    y: currentY - 70,
    width: width - (m + 16) * 2,
    height: 70,
    color: rgb(0.99, 0.99, 0.99),
    borderColor: BORDER_COLOR,
    borderWidth: 0.8
  });

  page.drawText('UDHEZIME ME RENDESI PER HYRJE & RREGULLAT ZYRTARE:', {
    x: m + 28,
    y: currentY - 15,
    size: 7.5,
    font: fontBold,
    color: NAVY_DARK
  });

  const instructions = [
    '1. Kjo bilete eshte individuale dhe e patransferueshme. Duhet te paraqitet e printuar ose ne telefon gjate hyrjes.',
    '2. Personat shoqerues te autorizuar duhet te jene se bashku me pjesemarresin kryesor ne momentin e verifikimit ne hyrje.',
    '3. Zyrtaret e organizimit mund te kerkojne verifikim te identitetit permes karteles studentore ose leternjoftimit.',
    '4. Dyert mbyllen 15 minuta para fillimit te ceremonise solemne. Vonesat nuk pranohen.'
  ];

  instructions.forEach((inst, idx) => {
    page.drawText(sanitizeText(inst), {
      x: m + 28,
      y: currentY - 29 - idx * 11,
      size: 7,
      font: fontRegular,
      color: SLATE_MED
    });
  });

  // Footer & Security Microprint
  const footerY = m + 14;
  page.drawLine({
    start: { x: m + 16, y: footerY + 12 },
    end: { x: width - m - 16, y: footerY + 12 },
    thickness: 0.5,
    color: GOLD
  });

  page.drawText('FAKULTETI I MJEKESISE • UNIVERSITETI I PRISHTINES • SISTEMI AUTOMATIK I BILETAVE ZYRTARE', {
    x: m + 20,
    y: footerY,
    size: 6.5,
    font: fontRegular,
    color: SLATE_MED
  });

  page.drawText(`ID: ${registration.verification_token.substring(0, 16)}`, {
    x: width - m - 130,
    y: footerY,
    size: 6.5,
    font: fontRegular,
    color: SLATE_MED
  });

  // If there are more than 6 guests, add clean overflow second page
  if (guestCount > 6) {
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    page2.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.985, 0.988, 0.992) });
    page2.drawRectangle({ x: m, y: m, width: width - m * 2, height: height - m * 2, borderColor: GOLD, borderWidth: 1.5 });
    page2.drawRectangle({ x: m + 5, y: m + 5, width: width - (m + 5) * 2, height: height - (m + 5) * 2, borderColor: NAVY_MED, borderWidth: 0.75 });
    drawOrnateCorners(page2, m + 7, m + 7, width - (m + 7) * 2, height - (m + 7) * 2, GOLD);

    page2.drawText('SHTOJCE: LISTA E PLOTE E PERSONAVE SHOQERUES', {
      x: m + 24,
      y: height - m - 30,
      size: 14,
      font: fontTimesBold,
      color: NAVY_DARK
    });
    page2.drawText(`Bileta: ${sanitizeText(registration.ticket_number)} | Pjesemarresi: ${fullName}`, {
      x: m + 24,
      y: height - m - 48,
      size: 10,
      font: fontRegular,
      color: GOLD
    });

    let p2Y = height - m - 80;
    guestList.forEach((guest, idx) => {
      page2.drawText(`${idx + 1}. ${sanitizeText(guest)}`, {
        x: m + 30,
        y: p2Y,
        size: 11,
        font: fontBold,
        color: SLATE_DARK
      });
      p2Y -= 24;
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Format 2: Compact Mobile Ticket Pass
 * (380 x 620 pt - Mobile & Digital Wallet Optimized)
 */
async function generateCompactTicket(registration, event, baseUrl) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const verificationUrl = `${baseUrl.replace(/\/$/, '')}/verify/${registration.verification_token}`;
  const qrBuffer = await generateQrBuffer(verificationUrl);
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  // Parse guests
  let guestList = [];
  try {
    if (typeof registration.guests_names === 'string') {
      guestList = JSON.parse(registration.guests_names);
    } else if (Array.isArray(registration.guests_names)) {
      guestList = registration.guests_names;
    }
  } catch (e) {
    if (registration.guests_names) {
      guestList = [registration.guests_names];
    }
  }

  const width = 380;
  const height = 620;
  const page = pdfDoc.addPage([width, height]);

  // Card Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.96, 0.97, 0.98)
  });

  // Top Dark Navy Card Header
  const headerHeight = 160;
  page.drawRectangle({
    x: 14,
    y: height - 14 - headerHeight,
    width: width - 28,
    height: headerHeight,
    color: NAVY_DARK
  });

  // Gold accent line
  page.drawRectangle({
    x: 14,
    y: height - 14 - 3,
    width: width - 28,
    height: 3,
    color: GOLD
  });

  // Institution title
  page.drawText('UNIVERSITETI I PRISHTINES', {
    x: 28,
    y: height - 36,
    size: 10,
    font: fontTimesBold,
    color: rgb(0.85, 0.9, 0.98)
  });

  page.drawText('FAKULTETI I MJEKESISE', {
    x: 28,
    y: height - 50,
    size: 11,
    font: fontBold,
    color: GOLD
  });

  // Event Name
  const eventName = sanitizeText(event.name);
  page.drawText(eventName.length > 30 ? eventName.substring(0, 28) + '...' : eventName, {
    x: 28,
    y: height - 76,
    size: 13,
    font: fontBold,
    color: WHITE
  });

  // Ticket Number & Format Badge
  page.drawText(sanitizeText(registration.ticket_number), {
    x: 28,
    y: height - 98,
    size: 12,
    font: fontBold,
    color: GOLD
  });

  page.drawText(`Data: ${sanitizeText(event.event_date)} • ${sanitizeText(event.event_time)}`, {
    x: 28,
    y: height - 118,
    size: 9,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.92)
  });

  page.drawText(`Vendi: ${sanitizeText(event.location)}`, {
    x: 28,
    y: height - 134,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.92)
  });

  // Perforated / Cutout Divider
  const dividerY = height - 14 - headerHeight;
  page.drawLine({
    start: { x: 20, y: dividerY },
    end: { x: width - 20, y: dividerY },
    thickness: 1,
    color: BORDER_COLOR
  });

  // Ticket Body
  const bodyY = dividerY;
  page.drawRectangle({
    x: 14,
    y: 20,
    width: width - 28,
    height: bodyY - 20,
    color: WHITE,
    borderColor: BORDER_COLOR,
    borderWidth: 1
  });

  // Participant Name Section
  const pName = sanitizeText(`${registration.first_name} ${registration.last_name}`);
  page.drawText('PJESEMARRESI:', {
    x: 30,
    y: bodyY - 28,
    size: 8,
    font: fontBold,
    color: SLATE_MED
  });
  page.drawText(pName, {
    x: 30,
    y: bodyY - 46,
    size: 14,
    font: fontBold,
    color: NAVY_DARK
  });

  page.drawText(sanitizeText(registration.programme), {
    x: 30,
    y: bodyY - 62,
    size: 10,
    font: fontBold,
    color: GOLD
  });

  // QR Code Center Box
  const qrSize = 130;
  const qrX = (width - qrSize) / 2;
  const qrY = bodyY - 205;

  page.drawRectangle({
    x: qrX - 8,
    y: qrY - 8,
    width: qrSize + 16,
    height: qrSize + 16,
    color: WHITE,
    borderColor: GOLD,
    borderWidth: 1.2
  });

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize
  });

  page.drawText('Paraqiteni kete QR kod gjate hyrjes', {
    x: width / 2 - 68,
    y: qrY - 18,
    size: 8,
    font: fontBold,
    color: NAVY_DARK
  });

  // Accompanying Guests Summary
  const guestsY = qrY - 40;
  page.drawRectangle({
    x: 28,
    y: guestsY - 48,
    width: width - 56,
    height: 48,
    color: NAVY_LIGHT,
    borderColor: BORDER_COLOR,
    borderWidth: 0.8
  });

  page.drawText('PERSONAT SHOQERUES:', {
    x: 38,
    y: guestsY - 14,
    size: 7.5,
    font: fontBold,
    color: NAVY_MED
  });

  if (guestList.length === 0) {
    page.drawText('Nuk ka shoqerues te regjistruar (vetem 1 hyrje)', {
      x: 38,
      y: guestsY - 32,
      size: 8.5,
      font: fontRegular,
      color: SLATE_DARK
    });
  } else {
    const guestNamesStr = guestList.join(', ');
    const displayGuests = guestNamesStr.length > 44 ? guestNamesStr.substring(0, 42) + '...' : guestNamesStr;
    page.drawText(`${guestList.length} shoqerues: ${sanitizeText(displayGuests)}`, {
      x: 38,
      y: guestsY - 32,
      size: 8.5,
      font: fontBold,
      color: SLATE_DARK
    });
  }

  // Footer microprint
  page.drawText('Universiteti i Prishtines • Fakulteti i Mjekesise', {
    x: width / 2 - 85,
    y: 30,
    size: 7,
    font: fontRegular,
    color: SLATE_MED
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Main Ticket Generation Dispatcher
 */
async function generateTicketPdf({ registration, event, format = null, baseUrl = 'http://localhost:3000' }) {
  const chosenFormat = format || event.ticket_format || 'a4';
  let pdfBuffer;

  if (chosenFormat === 'compact') {
    pdfBuffer = await generateCompactTicket(registration, event, baseUrl);
  } else {
    pdfBuffer = await generateA4Ticket(registration, event, baseUrl);
  }

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '../../uploads/tickets');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `ticket-${registration.ticket_number}.pdf`;
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, pdfBuffer);

  return {
    buffer: pdfBuffer,
    filename,
    filePath,
    format: chosenFormat
  };
}

module.exports = {
  generateTicketPdf,
  generateA4Ticket,
  generateCompactTicket,
  sanitizeText
};
