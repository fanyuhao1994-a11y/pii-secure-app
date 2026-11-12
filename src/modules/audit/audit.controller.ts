import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from './audit.service';
import { AppError } from '../../errors/AppError';

export class AuditController {
  async listLogs(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('权限不足：仅管理员可查看审计日志', 403);
      }

      const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

      const data = await AuditLogService.getLogs(limit, offset);
      return res.status(200).json({ status: 200, data });
    } catch (err) {
      next(err);
    }
  }
}
