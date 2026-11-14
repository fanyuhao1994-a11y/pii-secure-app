import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

// 解析版本化密钥环（如 "v2:xxx,v1:yyy"），并兼容旧版单密钥环境变量自动映射为 v1
function parseKeyRing(
  ringRaw: string | undefined,
  legacySingleRaw: string | undefined,
  activeVersion: string,
  fieldName: string
): { activeVersion: string; keys: Record<string, string> } {
  const effectiveRaw = ringRaw || (legacySingleRaw ? `v1:${legacySingleRaw}` : '');
  const keys: Record<string, string> = {};

  for (const item of effectiveRaw.split(',')) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) {
      throw new Error(`${fieldName} 格式错误，应为 "<version>:<secret>"`);
    }
    const ver = trimmed.slice(0, colonIdx).trim();
    const secret = trimmed.slice(colonIdx + 1).trim();
    if (secret.length < 32) {
      throw new Error(`${fieldName} 中版本 ${ver} 的密钥长度过短`);
    }
    keys[ver] = secret;
  }

  if (!keys[activeVersion]) {
    throw new Error(`${fieldName} 中未找到当前激活版本 "${activeVersion}"`);
  }

  return { activeVersion, keys };
}

// 1. 定义环境变量 Zod Schema（保留原有字段 + 新增多版本密钥环）
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/pii_db'),
  JWT_SECRET: z.string().default('super_secret_jwt_key_2026_pii_secure'),

  // 新版多版本密钥环变量
  PII_ENCRYPTION_KEYS: z.string().optional(),
  ACTIVE_ENCRYPTION_KEY_VERSION: z.string().default('v1'),
  PII_BLIND_INDEX_SALTS: z.string().optional(),
  ACTIVE_BLIND_INDEX_SALT_VERSION: z.string().default('v1'),

  // 旧版单密钥变量（兼容过渡期）
  PII_ENCRYPTION_KEY: z.string().optional(),
  PII_BLIND_INDEX_SALT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ 环境变量校验失败:', parsed.error.format());
  throw new Error('无效的环境变量配置，应用阻止启动。');
}

const data = parsed.data;

// 仅在开发/测试环境提供保底默认值；生产环境（production）缺失密钥将直接报错拦截
const isProd = data.NODE_ENV === 'production';
const defaultEncKey = isProd
  ? undefined
  : '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const defaultBlindSalt = isProd
  ? undefined
  : 'c9cf5a1e7a0353c10441a3c547736fd5bd0865da0601382bfef5ef6dbe2a8f14';

const encryptionKeyRing = parseKeyRing(
  data.PII_ENCRYPTION_KEYS,
  data.PII_ENCRYPTION_KEY ?? defaultEncKey,
  data.ACTIVE_ENCRYPTION_KEY_VERSION,
  'PII_ENCRYPTION_KEYS'
);

const blindIndexSaltRing = parseKeyRing(
  data.PII_BLIND_INDEX_SALTS,
  data.PII_BLIND_INDEX_SALT ?? defaultBlindSalt,
  data.ACTIVE_BLIND_INDEX_SALT_VERSION,
  'PII_BLIND_INDEX_SALTS'
);

// 提取当前激活版本的单值（兼容旧代码直接读取 piiEncryptionKey / piiBlindIndexSalt）
const activeEncryptionKey = encryptionKeyRing.keys[encryptionKeyRing.activeVersion];
const activeBlindIndexSalt = blindIndexSaltRing.keys[blindIndexSaltRing.activeVersion];

// 2. 导出全量配置：完整保留原有所有字段与别名，彻底消除 undefined 隐患
export const env = {
  ...data,
  PII_ENCRYPTION_KEY: activeEncryptionKey,
  PII_BLIND_INDEX_SALT: activeBlindIndexSalt,
};

export const config = {
  ...env,
  port: data.PORT,
  nodeEnv: data.NODE_ENV,
  databaseUrl: data.DATABASE_URL,
  piiEncryptionKey: activeEncryptionKey,
  piiBlindIndexSalt: activeBlindIndexSalt,
  jwtSecret: data.JWT_SECRET,
  encryptionKeyRing,
  blindIndexSaltRing,
};

export default config;