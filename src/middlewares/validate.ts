import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
}

/**
 * 通用 Zod 参数校验中间件 (TS 严格模式优化版)
 */
export function validateRequest(schema: ValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const parsedQuery = await schema.query.parseAsync(req.query);
        // 显式转类型以符合 Express req.query 的 ParsedQs 接口
        req.query = parsedQuery as Record<string, any>;
      }
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          code: 400,
          message: '请求参数校验失败',
          errors: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}