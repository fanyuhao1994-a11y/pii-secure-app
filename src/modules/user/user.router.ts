import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateToken } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate'; // 引入你的 validateRequest
import { CreateUserSchema } from './user.schema';
import { authLimiter, apiLimiter } from '../../middlewares/rateLimiter';

const router = Router();
const userController = new UserController();

// 1. 注册接口：注意这里用 { body: CreateUserSchema }
router.post(
  '/', 
  authLimiter, 
  validateRequest({ body: CreateUserSchema }), 
  userController.register.bind(userController)
);

// 2. 盲索引搜索接口
router.get(
  '/search', 
  apiLimiter, 
  authenticateToken, 
  userController.search.bind(userController)
);

// 3. 个人档案接口
router.get(
  '/me', 
  apiLimiter, 
  authenticateToken, 
  userController.getProfile.bind(userController)
);

export default router;