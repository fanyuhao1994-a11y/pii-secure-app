import crypto from 'crypto';
import { config } from '../config/env';

/**
 * 将配置中的加密密钥转为 32 字节 Buffer
 * 若为 64 位标准 Hex 字符串则按 hex 解析，否则按 utf8 兼容旧格式
 */
function resolveAesKeyBuffer(secret: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

// 1. AES-256-GCM 认证加密（始终使用当前激活版本）
export function encryptPii(plaintext: string): string {
  if (!plaintext) return '';
  const { activeVersion, keys } = config.encryptionKeyRing;
  const key = resolveAesKeyBuffer(keys[activeVersion]);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${activeVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// 2. AES-256-GCM 认证解密（同时兼容旧版 3 段式与新版 4 段式密文）
export function decryptPii(ciphertextEnvelope: string): string {
  if (!ciphertextEnvelope) return '';

  const parts = ciphertextEnvelope.split(':');
  let version: string;
  let ivHex: string;
  let tagHex: string;
  let cipherHex: string;

  if (parts.length === 3) {
    // 兼容数据库里已有的无版本号历史密文，默认使用 v1 密钥
    version = 'v1';
    [ivHex, tagHex, cipherHex] = parts;
  } else if (parts.length === 4) {
    [version, ivHex, tagHex, cipherHex] = parts;
  } else {
    throw new Error('解密失败：密文格式非法');
  }

  // 检查切分后的组件是否为空（例如 "::" 或 "1234::5678"）
  if (!ivHex || !tagHex || !cipherHex) {
    throw new Error('解密失败：密文组件不完整');
  }

  const secret = config.encryptionKeyRing.keys[version];
  if (!secret) {
    throw new Error(`解密失败：不支持的密钥版本 ${version}`);
  }

  const key = resolveAesKeyBuffer(secret);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// 3. HMAC-SHA256 盲索引（写入用：使用当前激活版本 Salt）
export function createBlindIndex(normalizedValue: string): string {
  if (!normalizedValue) return '';
  const { activeVersion, keys } = config.blindIndexSaltRing;
  const activeSalt = keys[activeVersion];
  // 保持与原有 createHmac('sha256', saltString) 完全一致的 utf8 编码行为
  return crypto
    .createHmac('sha256', activeSalt)
    .update(normalizedValue.trim().toLowerCase(), 'utf8')
    .digest('hex');
}

// 4. HMAC-SHA256 盲索引（查询用：返回所有已加载版本的候选哈希列表）
export function createCandidateBlindIndexes(normalizedValue: string): string[] {
  const normalized = normalizedValue.trim().toLowerCase();
  return Object.values(config.blindIndexSaltRing.keys).map((salt) =>
    crypto.createHmac('sha256', salt).update(normalized, 'utf8').digest('hex')
  );
}

// ==========================================
// 兼容别名：让原有业务代码中的旧函数名无缝指向新实现
// ==========================================
export const encryptField = encryptPii;
export const decryptField = decryptPii;
export const getBlindIndex = createBlindIndex;
export const getCandidateBlindIndexes = createCandidateBlindIndexes;