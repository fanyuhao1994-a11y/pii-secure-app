import { Request, Response, NextFunction } from 'express';
export interface UserPayload {
    id: string;
    role: string;
}
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
export declare function authenticateToken(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map