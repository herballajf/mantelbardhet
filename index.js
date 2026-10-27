const { createApp } = require('./server/app');
const { seedDatabase } = require('./server/db/seed');

const PORT = process.env.PORT || 3000;

try {
  // Ensure DB seeded with admin & inaugural events
  seedDatabase();

  const app = createApp();

  app.listen(PORT, '0.0.0.0', () => {
    console.log('================================================================');
    console.log('🏛  UNIVERSITETI I PRISHTINËS - FAKULTETI I MJEKËSISË');
    console.log('🎟  Sistemi Automatik i Biletave dhe Regjistrimeve Digjitale');
    console.log('================================================================');
    console.log(`✓ Serveri po funksionon në: http://localhost:${PORT}`);
    console.log(`✓ Webhook Endpoint: http://localhost:${PORT}/api/webhook/google-forms`);
    console.log(`✓ Paneli Administrativ: http://localhost:${PORT}/`);
    console.log(`✓ Stafi Check-in: http://localhost:${PORT}/checkin`);
    console.log('----------------------------------------------------------------');
    console.log('Kredencialet e paracaktuara:');
    console.log('  Admin: admin / Admin123!');
    console.log('  Staf:  staff / Staff123!');
    console.log('================================================================');
  });
} catch (err) {
  console.error('Fatal startup error:', err);
  process.exit(1);
}
