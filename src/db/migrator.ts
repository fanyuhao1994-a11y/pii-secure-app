import fs from 'fs';
import path from 'path';
import { db } from './index'; // 👈 导入 db

export async function runMigrations() {
  const client = await db.connect(); // 👈 使用 db.connect()
  try {
    await client.query('BEGIN');

    // 建立版本控制表
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIMEZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 获取已经执行过的 migration
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(rows.map((r: { version: string }) => r.version));

    // 兼顾开发环境 (src/) 与生产编译环境 (dist/) 的 migrations 目录
    const migrationsDir = fs.existsSync(path.join(__dirname, 'migrations'))
      ? path.join(__dirname, 'migrations')
      : path.join(process.cwd(), 'src', 'db', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      await client.query('COMMIT');
      return;
    }

    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql') && !appliedVersions.has(file)) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ All database migrations applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}