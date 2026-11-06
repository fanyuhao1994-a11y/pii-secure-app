import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// 1. 定义环境变量 Zod Schema（提供保底默认值，确保测试环境绝不崩溃）
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/pii_db'),
  PII_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  PII_BLIND_INDEX_SALT: z.string().default('c9cf5a1e7a0353c10441a3c547736fd5bd0865da0601382bfef5ef6dbe2a8f14'),
  JWT_SECRET: z.string().default('super_secret_jwt_key_2026_pii_secure'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ 环境变量校验失败:', parsed.error.format());
  throw new Error('无效的环境变量配置，应用阻止启动。');
}

const data = parsed.data;

// 2. 导出全量配置：同时支持大写下划线与驼峰命名，彻底消除 undefined 隐患
export const env = data;

export const config = {
  ...data,
  port: data.PORT,
  nodeEnv: data.NODE_ENV,
  databaseUrl: data.DATABASE_URL,
  piiEncryptionKey: data.PII_ENCRYPTION_KEY,
  piiBlindIndexSalt: data.PII_BLIND_INDEX_SALT,
  jwtSecret: data.JWT_SECRET,
};

export default config;