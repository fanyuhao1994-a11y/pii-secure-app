import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
interface ValidationSchema {
    body?: ZodSchema;
    query?: ZodSchema;
}
/**
 * 通用 Zod 参数校验中间件 (TS 严格模式优化版)
 */
export declare function validateRequest(schema: ValidationSchema): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=validate.d.ts.map