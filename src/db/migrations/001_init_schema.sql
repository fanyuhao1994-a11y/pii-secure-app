-- 001_init_schema.sql

-- 1. 建立版本记录表
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIMEZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 建立用户 PII 表（带盲索引盲查支持）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_encrypted TEXT NOT NULL,
    email_blind_index VARCHAR(64) NOT NULL UNIQUE, -- 盲索引用于快速匹配脱敏查询
    name_encrypted TEXT NOT NULL,
    created_at TIMESTAMP WITH TIMEZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email_blind ON users(email_blind_index);