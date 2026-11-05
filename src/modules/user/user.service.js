"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const db_1 = require("../../db");
const crypto_1 = require("../../utils/crypto");
const audit_service_1 = require("../audit/audit.service");
class UserService {
    // 1. 用户注册
    async createUser(dto) {
        const phoneEncrypted = (0, crypto_1.encryptField)(dto.phone);
        const phoneBlindIndex = (0, crypto_1.getBlindIndex)(dto.phone);
        const emailEncrypted = (0, crypto_1.encryptField)(dto.email);
        const emailBlindIndex = (0, crypto_1.getBlindIndex)(dto.email);
        const role = dto.role || 'MEMBER';
        const plainPassword = dto.password || 'DefaultSecurePass123!';
        const passwordHash = await argon2_1.default.hash(plainPassword);
        const sql = `
      INSERT INTO users (nickname, phone_encrypted, phone_blind_index, email_encrypted, email_blind_index, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nickname, phone_encrypted, email_encrypted, role, created_at;
    `;
        const result = await db_1.db.query(sql, [
            dto.nickname,
            phoneEncrypted,
            phoneBlindIndex,
            emailEncrypted,
            emailBlindIndex,
            role,
            passwordHash
        ]);
        const record = result.rows[0];
        // 记录审计日志：新用户注册
        await audit_service_1.AuditLogService.log({
            operatorId: record.id,
            operatorRole: record.role,
            action: 'PII_READ',
            targetUserId: record.id
        });
        return record;
    }
    // 2. 基于盲索引精准查询 + 审计埋点
    async searchUserByPhone(phone, operator) {
        // 判空防御
        if (!phone)
            return null;
        const blindIndex = (0, crypto_1.getBlindIndex)(phone);
        const sql = `SELECT id, nickname, phone_encrypted, email_encrypted, role FROM users WHERE phone_blind_index = $1`;
        const result = await db_1.db.query(sql, [blindIndex]);
        if (result.rows.length === 0)
            return null;
        const record = result.rows[0];
        // 记录审计日志
        if (operator) {
            await audit_service_1.AuditLogService.log({
                operatorId: operator.id,
                operatorRole: operator.role,
                action: 'PII_READ',
                targetUserId: record.id
            });
        }
        // 1. 解密
        let phoneStr = (0, crypto_1.decryptField)(record.phone_encrypted);
        let emailStr = (0, crypto_1.decryptField)(record.email_encrypted);
        // 2. RBAC 脱敏：除 ADMIN 外全部掩码
        const isAdmin = operator?.role === 'ADMIN';
        if (!isAdmin) {
            phoneStr = phoneStr.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
            emailStr = emailStr.replace(/^(.{2}).*(@.*)$/, '$1***$2');
        }
        return {
            id: record.id,
            nickname: record.nickname,
            phone: phoneStr,
            email: emailStr,
            role: record.role
        };
    }
    // 3. 读取用户档案 + 审计埋点
    async getUserById(userId, operator) {
        const sql = `SELECT id, nickname, phone_encrypted, email_encrypted, role FROM users WHERE id = $1`;
        const result = await db_1.db.query(sql, [userId]);
        if (result.rows.length === 0)
            return null;
        const record = result.rows[0];
        // 记录审计日志
        if (operator) {
            await audit_service_1.AuditLogService.log({
                operatorId: operator.id,
                operatorRole: operator.role,
                action: 'PII_READ',
                targetUserId: record.id
            });
        }
        // 1. 先解密拿到明文
        let phone = (0, crypto_1.decryptField)(record.phone_encrypted);
        let email = (0, crypto_1.decryptField)(record.email_encrypted);
        // 2. 判断访问者身份：只有 ADMIN 才能看明文，其他角色一律脱敏
        const isAdmin = operator?.role === 'ADMIN';
        if (!isAdmin) {
            phone = phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'); // 138****9999
            email = email.replace(/^(.{2}).*(@.*)$/, '$1***$2'); // me***@test.com
        }
        // 3. 返回脱敏/明文处理后的数据
        return {
            id: record.id,
            nickname: record.nickname,
            phone,
            email,
            role: record.role
        };
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map