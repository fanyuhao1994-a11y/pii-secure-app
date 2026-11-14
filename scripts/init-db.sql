CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(100) NOT NULL,
  phone_encrypted TEXT NOT NULL,
  phone_blind_index VARCHAR(64) NOT NULL,
  email_encrypted TEXT NOT NULL,
  email_blind_index VARCHAR(64) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone_blind_index ON users(phone_blind_index);
CREATE INDEX IF NOT EXISTS idx_users_email_blind_index ON users(email_blind_index);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL,
  operator_role VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_user_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);