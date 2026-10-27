CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL,
  location TEXT NOT NULL,
  organizer_name TEXT NOT NULL DEFAULT 'Fakulteti i Mjekësisë - Universiteti i Prishtinës',
  is_ksfm_event BOOLEAN NOT NULL DEFAULT TRUE,
  ticket_format TEXT NOT NULL DEFAULT 'a4' CHECK (ticket_format IN ('a4', 'compact')),
  ticket_prefix TEXT NOT NULL DEFAULT 'MED',
  auto_generate_tickets BOOLEAN NOT NULL DEFAULT TRUE,
  email_subject TEXT NOT NULL DEFAULT 'Bileta juaj zyrtare – {event_name}',
  email_body TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  field_mapping TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL,
  ticket_number TEXT UNIQUE NOT NULL,
  verification_token TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  programme TEXT NOT NULL,
  phone TEXT,
  guests_count INTEGER NOT NULL DEFAULT 0,
  guests_names TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  ticket_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ticket_pdf_path TEXT,
  email_status TEXT NOT NULL DEFAULT 'queued' CHECK (email_status IN ('queued', 'sent', 'failed')),
  email_error TEXT,
  email_sent_at TIMESTAMP,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMP,
  checked_in_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_number ON registrations(ticket_number);
CREATE INDEX IF NOT EXISTS idx_registrations_verification_token ON registrations(verification_token);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON registrations(checked_in);

CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  submission_id TEXT,
  source TEXT NOT NULL DEFAULT 'google_forms',
  status TEXT NOT NULL CHECK (status IN ('success', 'duplicate', 'validation_error', 'processing_error')),
  payload TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_event_id ON sync_logs(event_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
