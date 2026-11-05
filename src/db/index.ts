import { Pool } from 'pg';
import dotenv from 'dotenv';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('配置错误: 环境变量 DATABASE_URL 未定义');
}

export const db = new Pool({
  connectionString,
  // 数据库连接池配置
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});