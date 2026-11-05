import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// 定义环境变量的 Zod 校验 Schema
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  
  // PII 密钥相关校验
  PII_ENCRYPTION_KEY: z
    .string()
    .refine((val) => Buffer.from(val, 'hex').length === 32, {
      message: 'PII_ENCRYPTION_KEY 必须存在且为 64 位 Hex 字符串 (32 字节)',
    }),
  PII_BLIND_INDEX_SALT: z
    .string()
    .min(16, 'PII_BLIND_INDEX_SALT 必须存在且长度至少 16 位'),

  // JWT 密钥校验
  JWT_SECRET: z.string().min(16, 'JWT_SECRET 必须存在且长度至少 16 位').optional().default('default_jwt_secret_key_for_dev_123'),
});

// 解析环境变量
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ 环境变量校验失败，请检查 .env 配置：');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('环境变量校验未通过，服务拒绝启动');
  }

  return result.data;
};

const validatedEnv = parseEnv();

// 导出统一的 config 对象
export const config = {
  port: validatedEnv.PORT,
  piiEncryptionKey: Buffer.from(validatedEnv.PII_ENCRYPTION_KEY, 'hex'),
  piiBlindIndexSalt: validatedEnv.PII_BLIND_INDEX_SALT,
  jwtSecret: validatedEnv.JWT_SECRET,
};