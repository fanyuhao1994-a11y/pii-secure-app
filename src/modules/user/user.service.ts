import argon2 from 'argon2';
import { db } from '../../db';
import { encryptField, decryptField, getBlindIndex } from '../../utils/crypto';
import { AuditLogService } from '../audit/audit.service';
import { UserPayload } from '../../middlewares/auth';

export interface CreateUserDto {
  nickname: string;
  phone: string;
  email: string;
  password?: string;
  role?: string;
}

export class UserService {
  // 1. 用户注册
  async createUser(dto: CreateUserDto) {
    const phoneEncrypted = encryptField(dto.phone);
    const phoneBlindIndex = getBlindIndex(dto.phone);
    const emailEncrypted = encryptField(dto.email);
    const emailBlindIndex = getBlindIndex(dto.email);
    const role = dto.role || 'MEMBER';
    const plainPassword = dto.password || 'DefaultSecurePass123!';
    const passwordHash = await argon2.hash(plainPassword);

    const sql = `
      INSERT INTO users (nickname, phone_encrypted, phone_blind_index, email_encrypted, email_blind_index, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nickname, phone_encrypted, email_encrypted, role, created_at;
    `;

    const result = await db.query(sql, [
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
    await AuditLogService.log({
      operatorId: record.id,
      operatorRole: record.role,
      action: 'PII_READ',
      targetUserId: record.id
    });

    return record;
  }

  // 2. 基于盲索引精准查询 + 审计埋点
  async searchUserByPhone(phone: string, operator?: any) {
    // 判空防御
    if (!phone) return null;

    const blindIndex = getBlindIndex(phone);
    const sql = `SELECT id, nickname, phone_encrypted, email_encrypted, role FROM users WHERE phone_blind_index = $1`;
    const result = await db.query(sql, [blindIndex]);

    if (result.rows.length === 0) return null;

    const record = result.rows[0];

    // 记录审计日志
    if (operator) {
      await AuditLogService.log({
        operatorId: operator.id,
        operatorRole: operator.role,
        action: 'PII_READ',
        targetUserId: record.id
      });
    }

    // 1. 解密
    let phoneStr = decryptField(record.phone_encrypted);
    let emailStr = decryptField(record.email_encrypted);

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
  async getUserById(userId: string, operator?: any) {
    const sql = `SELECT id, nickname, phone_encrypted, email_encrypted, role FROM users WHERE id = $1`;
    const result = await db.query(sql, [userId]);

    if (result.rows.length === 0) return null;

    const record = result.rows[0];

    // 记录审计日志
    if (operator) {
      await AuditLogService.log({
        operatorId: operator.id,
        operatorRole: operator.role,
        action: 'PII_READ',
        targetUserId: record.id
      });
    }

    // 1. 先解密拿到明文
    let phone = decryptField(record.phone_encrypted);
    let email = decryptField(record.email_encrypted);

    // 2. 判断访问者身份：只有 ADMIN 才能看明文，其他角色一律脱敏
    const isAdmin = operator?.role === 'ADMIN';
    if (!isAdmin) {
      phone = phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'); // 138****9999
      email = email.replace(/^(.{2}).*(@.*)$/, '$1***$2');       // me***@test.com
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