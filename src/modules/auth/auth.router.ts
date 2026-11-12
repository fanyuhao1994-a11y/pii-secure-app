import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validate';
import { authLimiter } from '../../middlewares/rateLimiter';
import { LoginSchema } from './auth.schema';

const router = Router();
const authController = new AuthController();

router.post(
  '/login',
  authLimiter,
  validateRequest({ body: LoginSchema }),
  authController.login.bind(authController)
);

export default router;
