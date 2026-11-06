import dotenv from 'dotenv';
import { z } from 'zod';

// 加载 .env
dotenv.config();

// 定义环境变量的 Zod 校验 Schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url('DATABASE_URL 必须是有效的 PostgreSQL 连接 URL'),
  
  // AES-256 要求 32 字节（64 位 Hex 字符）
  PII_ENCRYPTION_KEY: z.string().length(64, 'PII_ENCRYPTION_KEY 必须为 64 位十六进制字符串'),
  PII_BLIND_INDEX_SALT: z.string().min(32, 'PII_BLIND_INDEX_SALT 长度不能少于 32 位'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET 长度不能少于 16 位'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ 环境变量校验失败:', _env.error.format());
  throw new Error('无效的环境变量配置，应用阻止启动。');
}

export const env = _env.data;