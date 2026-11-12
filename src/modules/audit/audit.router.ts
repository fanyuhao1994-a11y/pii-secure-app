import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticateToken } from '../../middlewares/auth';
import { apiLimiter } from '../../middlewares/rateLimiter';

const router = Router();
const auditController = new AuditController();

router.get(
  '/',
  apiLimiter,
  authenticateToken,
  auditController.listLogs.bind(auditController)
);

export default router;
