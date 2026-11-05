/**
 * 1. 计算盲索引 (HMAC-SHA256)
 * 用于数据库精准查询。做规范化清洗（去前后空格 + 转小写），确保输入一致性。
 */
export declare function getBlindIndex(plainText: string): string;
/**
 * 2. 字段加密 (AES-256-GCM)
 * 格式: [IV(hex)]:[Ciphertext(hex)]:[AuthTag(hex)]
 */
export declare function encryptField(plainText: string): string;
/**
/**
 * 3. 字段解密 (AES-256-GCM)
 */
export declare function decryptField(encryptedPayload: string): string;
//# sourceMappingURL=crypto.d.ts.map