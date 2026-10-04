-- ===== URLY Warning Database Schema (Supabase/PostgreSQL) =====
-- This schema provides:
-- - User authentication (users, sessions)
-- - Scan result caching (to prevent hallucination)
-- - Per-user scan history

-- ===== Users Table =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== Sessions Table =====
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== Scan Cache Table =====
-- Stores scan results keyed by URL hash to prevent identical URLs from being re-scanned
CREATE TABLE IF NOT EXISTS scan_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url_hash VARCHAR(64) UNIQUE NOT NULL,
  url VARCHAR(2048) NOT NULL,
  result JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== Scan History Table =====
-- Stores per-user scan history for persistence across sessions
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  result JSONB NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== Indexes for Performance =====
CREATE INDEX IF NOT EXISTS idx_scan_cache_hash ON scan_cache(url_hash);
CREATE INDEX IF NOT EXISTS idx_scan_cache_expires ON scan_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_scan_history_user ON scan_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_user_url ON scan_history(user_id, url);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ===== Supabase API Access (Required for anon-key backend mode) =====
-- Your Node server currently connects with the publishable/anon key.
-- These grants allow PostgREST (anon/authenticated roles) to read/write these tables.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sessions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scan_cache TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scan_history TO anon, authenticated, service_role;

-- Disable RLS for custom app tables in this phase so backend token-session flow works.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE scan_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history DISABLE ROW LEVEL SECURITY;

-- ===== Row Level Security (Optional but Recommended) =====
-- Uncomment these if you want to enforce security at the database level

-- ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only access their own scans" ON scan_history
--   USING (user_id = auth.uid());

-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only access their own sessions" ON sessions
--   USING (user_id = auth.uid());
