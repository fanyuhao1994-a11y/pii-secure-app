"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const db_1 = require("../../db");
class AuditLogService {
    /**
     * 异步记录 PII 审计日志
     */
    static async log(dto) {
        try {
            const sql = `
        INSERT INTO audit_logs (operator_id, operator_role, action, target_user_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `;
            await db_1.db.query(sql, [
                dto.operatorId,
                dto.operatorRole,
                dto.action,
                dto.targetUserId || null,
                dto.details ? JSON.stringify(dto.details) : null
            ]);
        }
        catch (error) {
            console.error('⚠️ 写入审计日志失败:', error);
        }
    }
}
exports.AuditLogService = AuditLogService;
//# sourceMappingURL=audit.service.js.map