import { db } from '../../db';

export interface LogAccessDto {
  operatorId: string;
  operatorRole: string;
  action: 'PII_READ' | 'BLIND_INDEX_SEARCH' | 'USER_REGISTER';
  targetUserId?: string;
  details?: Record<string, any>;
}

export class AuditLogService {
  /**
   * 异步记录 PII 审计日志
   */
  static async log(dto: LogAccessDto) {
    try {
      const sql = `
        INSERT INTO audit_logs (operator_id, operator_role, action, target_user_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(sql, [
        dto.operatorId,
        dto.operatorRole,
        dto.action,
        dto.targetUserId || null,
        dto.details ? JSON.stringify(dto.details) : null
      ]);
    } catch (error) {
      console.error('⚠️ 写入审计日志失败:', error);
    }
  }
}