import { Pool } from 'pg';
import { config } from '../config/env';

export const db = new Pool({
  connectionString: config.databaseUrl,
  // 数据库连接池配置
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});