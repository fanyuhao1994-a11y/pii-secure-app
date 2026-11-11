import { describe, it, expect } from '@jest/globals';
import { encryptField, decryptField, getBlindIndex } from '../crypto';

describe('Crypto Utility Unit Tests (全量与边界覆盖)', () => {
  it('正确加密并解密字符串', () => {
    const raw = 'my-secret-pii-data';
    const encrypted = encryptField(raw);
    expect(encrypted).toContain(':');
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(raw);
  });

  it('传入空字符串或 falsy 时应返回空字符串', () => {
    expect(getBlindIndex('')).toBe('');
    expect(encryptField('')).toBe('');
    expect(decryptField('')).toBe('');
  });

  it('解密段数不为 3 时应抛出格式非法异常', () => {
    expect(() => decryptField('invalid_cipher_text')).toThrow('解密失败：密文格式非法');
    expect(() => decryptField('a:b')).toThrow('解密失败：密文格式非法');
  });

  it('解密组件缺失或为空时应触发组件不完整异常 (覆盖第 49 行)', () => {
    expect(() => decryptField('::')).toThrow('解密失败：密文组件不完整');
    expect(() => decryptField('1234::5678')).toThrow('解密失败：密文组件不完整');
  });

  it('密文或 Tag 被篡改时解密应抛出异常 (覆盖第 58 行)', () => {
    const encrypted = encryptField('valid_secret');
    const parts = encrypted.split(':');
    // 破坏 AuthTag
    const tampered = `${parts[0]}:${parts[1]}:00000000000000000000000000000000`;
    expect(() => decryptField(tampered)).toThrow();
  });

  it('盲索引一致性与规范化 (忽略大小写与空格)', () => {
    const hash1 = getBlindIndex(' 13800138000 ');
    const hash2 = getBlindIndex('13800138000');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
