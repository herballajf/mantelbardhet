const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const verifyRoutes = require('./routes/verify');
const webhookRoutes = require('./routes/webhook');
const settingsRoutes = require('./routes/settings');
const { initDb } = require('./db');

function createApp() {
  initDb();

  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Ensure uploads directories exist
  const uploadsDir = path.join(__dirname, '../uploads');
  const ticketsDir = path.join(uploadsDir, 'tickets');
  const logosDir = path.join(uploadsDir, 'logos');
  [uploadsDir, ticketsDir, logosDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // Serve static uploads
  app.use('/uploads', express.static(uploadsDir));

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/registrations', registrationRoutes);
  app.use('/api/verify', verifyRoutes);
  app.use('/api/checkin', verifyRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/settings', settingsRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'Sistemi Zyrtar i Biletave - Universiteti i Prishtinës, Fakulteti i Mjekësisë',
      timestamp: new Date().toISOString()
    });
  });

  // Serve Frontend in production (built dist folder)
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Central error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled Application Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Ndodhi një gabim i papritur në server.'
    });
  });

  return app;
}

module.exports = { createApp };
