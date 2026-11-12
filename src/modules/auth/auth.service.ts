import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { getBlindIndex } from '../../utils/crypto';
import { AppError } from '../../errors/AppError';
import { AuditLogService } from '../audit/audit.service';

export class AuthService {
  async login(phone: string, password: string) {
    const blindIndex = getBlindIndex(phone);
    const sql = `SELECT id, nickname, role, password_hash FROM users WHERE phone_blind_index = $1`;
    const result = await db.query(sql, [blindIndex]);

    if (result.rows.length === 0) {
      throw new AppError('手机号或密码错误', 401);
    }

    const user = result.rows[0];
    const isPasswordValid = await argon2.verify(user.password_hash, password);
    if (!isPasswordValid) {
      throw new AppError('手机号或密码错误', 401);
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    await AuditLogService.log({
      operatorId: user.id,
      operatorRole: user.role,
      action: 'USER_LOGIN',
      targetUserId: user.id,
    });

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        role: user.role,
      },
    };
  }
}
