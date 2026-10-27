const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { initDb, execute, queryOne, queryAll } = require('./index');

function seedDatabase() {
  initDb();

  // 1. Seed Users
  const adminExists = queryOne('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const adminPassHash = bcrypt.hashSync('Admin123!', 10);
    const staffPassHash = bcrypt.hashSync('Staff123!', 10);

    execute(
      `INSERT INTO users (username, email, password_hash, full_name, role) 
       VALUES (?, ?, ?, ?, ?)`,
      ['admin', 'admin@uni-pr.edu', adminPassHash, 'Prof. Dr. Admin Dekanati', 'admin']
    );

    execute(
      `INSERT INTO users (username, email, password_hash, full_name, role) 
       VALUES (?, ?, ?, ?, ?)`,
      ['staff', 'staff@uni-pr.edu', staffPassHash, 'Zyrtari i Check-in (KSFM)', 'staff']
    );
    console.log('✓ Users created: admin (password: Admin123!), staff (password: Staff123!)');
  }

  // 2. Default Events
  const defaultFieldMapping = JSON.stringify({
    first_name: 'Emri',
    last_name: 'Mbiemri',
    email: 'Email Adresa',
    programme: 'Dega / Programi i Studimit',
    guests_names: 'Emrat e Personave Shoqërues',
    guests_count: 'Numri i Personave Shoqërues',
    phone: 'Numri i Telefonit',
    submission_id: 'Timestamp'
  });

  const event1Exists = queryOne('SELECT id FROM events WHERE slug = ?', ['white-coat-ceremony-2026']);
  if (!event1Exists) {
    execute(
      `INSERT INTO events (
        slug, name, description, event_date, event_time, location, organizer_name,
        is_ksfm_event, ticket_format, ticket_prefix, auto_generate_tickets,
        email_subject, email_body, webhook_secret, field_mapping
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'white-coat-ceremony-2026',
        'Ceremonia e Mantelit të Bardhë 2026',
        'Ceremonia solemne e veshjes së mantelit të bardhë dhe dhënies së zotimit për studentët e vitit të parë të Fakultetit të Mjekësisë të Universitetit të Prishtinës.',
        '2026-11-15',
        '11:00',
        'Salla e Kuqe, Pallati i Rinisë, Prishtinë',
        'Fakulteti i Mjekësisë & KSFM',
        1,
        'a4',
        'WCC',
        1,
        'Bileta juaj zyrtare – {event_name}',
        `I/e nderuar {first_name} {last_name},

Regjistrimi juaj për aktivitetin "{event_name}" është pranuar me sukses.

Bashkëngjitur gjeni biletën tuaj personale zyrtare në formatin PDF. Ju lutemi, ruajeni dhe paraqiteni këtë biletë (të printuar ose në format digjital në telefon) gjatë hyrjes në aktivitet.

Bileta përmban të dhënat tuaja, numrin unik të biletës ({ticket_number}) dhe informacionin për personat shoqërues të regjistruar ({guests_count} persona shoqërues).

Data dhe ora: {event_date}, {event_time}
Vendi: {location}

Ju lutemi të paraqiteni të paktën 30 minuta para fillimit të ceremonisë.

Me respekt,
{organizer_name}`,
        'wcc_sec_98f7e2a4b1c',
        defaultFieldMapping
      ]
    );

    execute(
      `INSERT INTO events (
        slug, name, description, event_date, event_time, location, organizer_name,
        is_ksfm_event, ticket_format, ticket_prefix, auto_generate_tickets,
        email_subject, email_body, webhook_secret, field_mapping
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'imssc-2026',
        'Kongresi Ndërkombëtar Studentor i Shkencave Mjekësore (IMSSC 2026)',
        'Kongresi vjetor shkencor i organizuar nga studentët dhe profesorët e Fakultetit të Mjekësisë.',
        '2026-12-05',
        '09:30',
        'Amfiteatri Qendror, Fakulteti i Mjekësisë, Prishtinë',
        'Fakulteti i Mjekësisë - Universiteti i Prishtinës',
        1,
        'compact',
        'IMSSC',
        1,
        'Bileta juaj zyrtare – {event_name}',
        `I/e nderuar {first_name} {last_name},

Regjistrimi juaj për kongresin shkencor "{event_name}" u krye me sukses.
Gjeni biletën tuaj elektronike të bashkangjitur.

Me respekt,
Këshilli Organizativ i IMSSC`,
        'imssc_sec_4a8c9e11f0',
        defaultFieldMapping
      ]
    );

    execute(
      `INSERT INTO events (
        slug, name, description, event_date, event_time, location, organizer_name,
        is_ksfm_event, ticket_format, ticket_prefix, auto_generate_tickets,
        email_subject, email_body, webhook_secret, field_mapping
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'orientimi-2026',
        'Dita e Orientimit për Studentët e Rinj 2026',
        'Takim informues dhe mirëseardhje për gjeneratën e re të studentëve të Fakultetit të Mjekësisë.',
        '2026-10-30',
        '10:00',
        'Holli Kryesor, Fakulteti i Mjekësisë, Prishtinë',
        'Këshilli i Studentëve të Fakultetit të Mjekësisë (KSFM)',
        1,
        'compact',
        'ORI',
        1,
        'Bileta juaj zyrtare – {event_name}',
        `I/e nderuar {first_name} {last_name},

Ju mirëpresim në Ditën e Orientimit!
Bashkëngjitur gjeni biletën tuaj digjitale.

Me respekt,
KSFM`,
        'ksfm_sec_77b312ee01',
        defaultFieldMapping
      ]
    );
    console.log('✓ Inaugural events created');
  }

  // 3. Sample Registrations
  const event1 = queryOne('SELECT id FROM events WHERE slug = ?', ['white-coat-ceremony-2026']);
  if (event1) {
    const existingReg = queryOne('SELECT id FROM registrations WHERE event_id = ?', [event1.id]);
    if (!existingReg) {
      const sampleParticipants = [
        {
          subId: 'GF-RESP-1001',
          ticketNum: 'WCC-2026-00101',
          token: crypto.randomBytes(16).toString('hex'),
          first: 'Elira',
          last: 'Krasniqi',
          email: 'elira.krasniqi@student.uni-pr.edu',
          prog: 'Mjekësi e Përgjithshme',
          phone: '+383 44 112 233',
          guestsCount: 2,
          guestsNames: JSON.stringify(['Agim Krasniqi (Prind)', 'Valbona Krasniqi (Prind)']),
          status: 'active',
          emailStatus: 'sent',
          checkedIn: 0
        },
        {
          subId: 'GF-RESP-1002',
          ticketNum: 'WCC-2026-00102',
          token: crypto.randomBytes(16).toString('hex'),
          first: 'Dren',
          last: 'Gashi',
          email: 'dren.gashi@student.uni-pr.edu',
          prog: 'Stomatologji',
          phone: '+383 49 223 344',
          guestsCount: 1,
          guestsNames: JSON.stringify(['Besnik Gashi (Prind)']),
          status: 'active',
          emailStatus: 'sent',
          checkedIn: 1,
          checkedInAt: '2026-11-15 10:24:12'
        },
        {
          subId: 'GF-RESP-1003',
          ticketNum: 'WCC-2026-00103',
          token: crypto.randomBytes(16).toString('hex'),
          first: 'Arta',
          last: 'Morina',
          email: 'arta.morina@student.uni-pr.edu',
          prog: 'Farmaci',
          phone: '+383 45 334 455',
          guestsCount: 0,
          guestsNames: JSON.stringify([]),
          status: 'active',
          emailStatus: 'sent',
          checkedIn: 0
        },
        {
          subId: 'GF-RESP-1004',
          ticketNum: 'WCC-2026-00104',
          token: crypto.randomBytes(16).toString('hex'),
          first: 'Lorik',
          last: 'Berisha',
          email: 'lorik.berisha@student.uni-pr.edu',
          prog: 'Fizioterapi',
          phone: '+383 44 445 566',
          guestsCount: 3,
          guestsNames: JSON.stringify(['Fatmir Berisha (Prind)', 'Shqipe Berisha (Prind)', 'Dr. Mentor Berisha (Mysafir)']),
          status: 'active',
          emailStatus: 'queued',
          checkedIn: 0
        },
        {
          subId: 'GF-RESP-1005',
          ticketNum: 'WCC-2026-00105',
          token: crypto.randomBytes(16).toString('hex'),
          first: 'Donika',
          last: 'Kelmendi',
          email: 'donika.kelmendi@student.uni-pr.edu',
          prog: 'Infermieri e Përgjithshme',
          phone: '+383 49 556 677',
          guestsCount: 4,
          guestsNames: JSON.stringify(['Luan Kelmendi', 'Teuta Kelmendi', 'Vesa Kelmendi', 'Yll Kelmendi']),
          status: 'active',
          emailStatus: 'sent',
          checkedIn: 0
        }
      ];

      for (const p of sampleParticipants) {
        execute(
          `INSERT INTO registrations (
            event_id, submission_id, ticket_number, verification_token,
            first_name, last_name, email, programme, phone,
            guests_count, guests_names, status, ticket_generated,
            email_status, email_sent_at, checked_in, checked_in_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          [
            event1.id, p.subId, p.ticketNum, p.token,
            p.first, p.last, p.email, p.prog, p.phone,
            p.guestsCount, p.guestsNames, p.status,
            p.emailStatus, p.emailStatus === 'sent' ? '2026-10-25 14:00:00' : null,
            p.checkedIn, p.checkedInAt || null
          ]
        );
      }
      console.log('✓ Realistic sample registrations seeded');
    }
  }

  // 4. Default System Settings
  execute(
    `INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`,
    ['smtp_configured', '0']
  );
  execute(
    `INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`,
    ['smtp_host', 'smtp.gmail.com']
  );
  execute(
    `INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`,
    ['smtp_port', '587']
  );
  execute(
    `INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`,
    ['smtp_from', 'biletat@uni-pr.edu']
  );
  execute(
    `INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`,
    ['data_retention_days', '365']
  );

  console.log('Database initialization & seed complete!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
