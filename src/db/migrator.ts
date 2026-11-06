import { db } from './index';

export async function runMigrations() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. 建立版本控制表
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. 建立用户 PII 表（如果表已存在则不会报错）
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_encrypted TEXT NOT NULL,
        email_blind_index VARCHAR(64) NOT NULL UNIQUE,
        name_encrypted TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. 【关键修复】针对已有旧表但缺字段的情况，动态安全补全字段
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_encrypted TEXT;');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_blind_index VARCHAR(64);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name_encrypted TEXT;');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;');

    // 4. 创建盲索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_blind ON users(email_blind_index);
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