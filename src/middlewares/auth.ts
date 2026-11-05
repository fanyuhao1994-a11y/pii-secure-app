import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface UserPayload {
  id: string;
  role: string;
}

// 扩展 Express Request 类型，注入 user 字段
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * 校验 JWT Token 并解析用户角色注入 req.user
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 获取 Bearer <token>

  if (!token) {
    return res.status(401).json({ code: 401, message: '未提供 Token，请先登录' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as UserPayload;

    // 将解析出的身份挂载到 req.user，privacy.ts 脱敏中间件会自动读取 req.user.role
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ code: 403, message: 'Token 无效或已过期' });
  }
}