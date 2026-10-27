const express = require('express');
const router = express.Router();
const { queryOne, queryAll } = require('../db');
const { processSubmission } = require('../services/webhookService');
const { authenticate, requireStaffOrAdmin } = require('../middleware/auth');

// Generic Webhook Endpoint (resolves secret from headers or payload)
router.post('/google-forms', async (req, res) => {
  const secret = req.headers['x-webhook-secret'] || req.query.secret || req.body.secret;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const result = await processSubmission({
      payload: req.body,
      secret,
      source: 'google_forms',
      baseUrl
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Event-specific Webhook Endpoint: /api/webhook/google-forms/:slug
router.post('/google-forms/:slug', async (req, res) => {
  const { slug } = req.params;
  const secret = req.headers['x-webhook-secret'] || req.query.secret || req.body.secret;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const result = await processSubmission({
      eventSlug: slug,
      payload: req.body,
      secret,
      source: 'google_forms',
      baseUrl
    });

    res.status(200).json(result);
  } catch (err) {
    console.error(`Webhook error for event ${slug}:`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// Test Integration Simulator (Used by Admin in Dashboard to test field mappings & generation)
router.post('/test-simulator', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { event_id, payload } = req.body;
  if (!event_id) return res.status(400).json({ error: 'Ju lutemi zgjidhni aktivitetin.' });

  const event = queryOne('SELECT * FROM events WHERE id = ?', [event_id]);
  if (!event) return res.status(404).json({ error: 'Aktiviteti nuk u gjet.' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const result = await processSubmission({
      eventId: event.id,
      payload: payload || {},
      secret: event.webhook_secret,
      source: 'test_simulator',
      baseUrl
    });

    res.json({
      success: true,
      message: 'Testi u ekzekutua me sukses! Regjistrimi dhe bileta u procesuan.',
      result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: `Testi dështoi: ${err.message}`
    });
  }
});

// GET /api/webhook/sync-logs
router.get('/sync-logs', authenticate, requireStaffOrAdmin, (req, res) => {
  const { event_id, limit = 50 } = req.query;
  let sql = `
    SELECT s.*, e.name as event_name, e.slug as event_slug
    FROM sync_logs s
    LEFT JOIN events e ON s.event_id = e.id
  `;
  const params = [];

  if (event_id) {
    sql += ' WHERE s.event_id = ?';
    params.push(event_id);
  }

  sql += ' ORDER BY s.id DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const logs = queryAll(sql, params);
  res.json({ logs });
});

// GET /api/webhook/setup-script/:slug (Generates complete, ready-to-paste Google Apps Script)
router.get('/setup-script/:slug', (req, res) => {
  const event = queryOne('SELECT * FROM events WHERE slug = ?', [req.params.slug]);
  if (!event) return res.status(404).json({ error: 'Aktiviteti nuk u gjet.' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const webhookUrl = `${baseUrl}/api/webhook/google-forms/${event.slug}`;

  const scriptCode = `/**
 * ============================================================================
 * UNIVERSITETI I PRISHTINËS - FAKULTETI I MJEKËSISË
 * Skripta Zyrtare e Integrimit të Google Forms / Google Sheets
 * Aktiviteti: ${event.name}
 * ============================================================================
 * 
 * UDHËZIME PËR INSTALIM:
 * 1. Hapni Google Sheet-in e lidhur me Google Form-ën tuaj.
 * 2. Në menynë e sipërme klikoni: Extensions (Zgjerimet) -> Apps Script.
 * 3. Fshini çdo kod ekzistues dhe ngjisni (Paste) këtë kod të plotë.
 * 4. Klikoni "Save" (Ruaj).
 * 5. Në anën e majtë klikoni ikonën e Orës (Triggers / Shkaktuesit).
 * 6. Klikoni "+ Add Trigger" në këndin e poshtëm djathtas:
 *    - Choose which function to run: onFormSubmit
 *    - Select event source: From spreadsheet
 *    - Select event type: On form submit
 * 7. Klikoni "Save" dhe lejoni autorizimin e kërkuar nga Google.
 */

const WEBHOOK_URL = "${webhookUrl}";
const WEBHOOK_SECRET = "${event.webhook_secret}";

function onFormSubmit(e) {
  if (!e) {
    Logger.log("Nuk u gjetën të dhëna nga e (event object).");
    return;
  }

  try {
    // Merr vlerat nga formularët e Google
    const namedValues = e.namedValues || {};
    const values = e.values || [];
    
    const payload = {
      source: "google_forms_apps_script",
      timestamp: new Date().toISOString(),
      namedValues: namedValues,
      values: values
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "X-Webhook-Secret": WEBHOOK_SECRET
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    Logger.log("Përgjigjja e serverit UP: " + responseCode + " - " + responseBody);

    if (responseCode === 200 || responseCode === 201) {
      Logger.log("✓ Bileta u dërgua dhe u regjistrua me sukses!");
    } else {
      Logger.log("✕ Gabim gjatë sinkronizimit: " + responseBody);
    }
  } catch (err) {
    Logger.log("Gabim kritik në Apps Script: " + err.toString());
  }
}

/**
 * Funksion për testim të shpejtë nga Apps Script Editor
 */
function testWebhookDirectly() {
  const testPayload = {
    source: "apps_script_test",
    namedValues: {
      "Emri": ["Student Test"],
      "Mbiemri": ["Prishtina"],
      "Email Adresa": ["test.student@student.uni-pr.edu"],
      "Dega / Programi i Studimit": ["Mjekësi e Përgjithshme"],
      "Emrat e Personave Shoqërues": ["Mysafir 1, Mysafir 2"],
      "Numri i Personave Shoqërues": ["2"],
      "Numri i Telefonit": ["+383 44 000 000"],
      "Timestamp": [new Date().toISOString()]
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log("Rezultati i Testit: " + response.getContentText());
}
`;

  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.send(scriptCode);
});

module.exports = router;
