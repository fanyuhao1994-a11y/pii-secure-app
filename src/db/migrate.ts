import { db } from './index';

async function runMigration() {
  try {
    console.log('🚀 开始执行数据库 Migration...');

    // 1. 创建 users 表与盲索引
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname VARCHAR(50) NOT NULL,
        phone_encrypted TEXT NOT NULL,
        phone_blind_index VARCHAR(64) NOT NULL,
        email_encrypted TEXT NOT NULL,
        email_blind_index VARCHAR(64) NOT NULL,
        role VARCHAR(20) DEFAULT 'MEMBER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_phone_blind ON users(phone_blind_index);
      CREATE INDEX IF NOT EXISTS idx_users_email_blind ON users(email_blind_index);
    `);

    // 2. 创建 audit_logs 审计日志表
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id VARCHAR(255) NOT NULL,
        operator_role VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_user_id VARCHAR(255),
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_operator ON audit_logs(operator_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    `);

    console.log('✅ 数据库建表、盲索引与审计日志表创建成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration 执行失败:', error);
    process.exit(1);
  }
}

runMigration();