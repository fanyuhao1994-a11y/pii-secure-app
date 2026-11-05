import crypto from 'node:crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 模式推荐 96-bit (12 bytes) IV

/**
 * 1. 计算盲索引 (HMAC-SHA256)
 * 用于数据库精准查询。做规范化清洗（去前后空格 + 转小写），确保输入一致性。
 */
export function getBlindIndex(plainText: string): string {
  if (!plainText) return '';
  const normalized = plainText.trim().toLowerCase();
  return crypto
    .createHmac('sha256', config.piiBlindIndexSalt)
    .update(normalized)
    .digest('hex');
}

/**
 * 2. 字段加密 (AES-256-GCM)
 * 格式: [IV(hex)]:[Ciphertext(hex)]:[AuthTag(hex)]
 */
export function encryptField(plainText: string): string {
  if (!plainText) return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, config.piiEncryptionKey, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${tag}`;
}

/**
/**
 * 3. 字段解密 (AES-256-GCM)
 */
export function decryptField(encryptedPayload: string): string {
  if (!encryptedPayload) return '';

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('解密失败：密文格式非法');
  }

  const ivHex = parts[0];
  const ciphertextHex = parts[1];
  const tagHex = parts[2];

  // 增加类型守卫防线，排除 undefined 可能性
  if (!ivHex || !ciphertextHex || !tagHex) {
    throw new Error('解密失败：密文组件不完整');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    config.piiEncryptionKey,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}