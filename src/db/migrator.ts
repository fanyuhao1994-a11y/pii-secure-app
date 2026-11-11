import { db } from './index';

export async function runMigrations() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 启用 UUID 扩展
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // 1. 建立版本控制表
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. 建立用户 PII 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname VARCHAR(100) NOT NULL,
        phone_encrypted TEXT NOT NULL,
        phone_blind_index VARCHAR(64) NOT NULL,
        email_encrypted TEXT NOT NULL,
        email_blind_index VARCHAR(64) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 兼容可能存在的旧表结构，动态补充字段
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) DEFAULT \'User\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_encrypted TEXT DEFAULT \'\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_blind_index VARCHAR(64) DEFAULT \'\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_encrypted TEXT DEFAULT \'\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_blind_index VARCHAR(64) DEFAULT \'\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT \'MEMBER\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT \'\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;');

    // 3. 创建盲索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_phone_blind_index ON users(phone_blind_index);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email_blind_index ON users(email_blind_index);');

    // 4. 建立审计日志表
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID NOT NULL,
        operator_role VARCHAR(20) NOT NULL,
        action VARCHAR(50) NOT NULL,
        target_user_id UUID,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database migrations applied and synced successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}