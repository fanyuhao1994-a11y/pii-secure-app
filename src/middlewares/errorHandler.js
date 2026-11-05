"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const zod_1 = require("zod");
const AppError_1 = require("../errors/AppError");
const logger_1 = require("../utils/logger");
// 404 路由未找到兜底
const notFoundHandler = (req, res, next) => {
    next(new AppError_1.AppError(`未找到请求的路径: ${req.originalUrl}`, 404));
};
exports.notFoundHandler = notFoundHandler;
// 全局统一错误处理中间件 (必须包含 4 个参数)
const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-strict-skip
next) => {
    // 1. Zod 参数校验异常
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: '请求参数校验失败',
            errors: err.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }
    // 2. 自定义业务/操作性异常 (AppError)
    if (err instanceof AppError_1.AppError) {
        return res.status(err.statusCode).json({
            status: err.statusCode,
            code: err.name || 'BUSINESS_ERROR',
            message: err.message,
        });
    }
    // 3. PostgreSQL 数据库唯一约束冲突 (23505)
    if (err.code === '23505') {
        return res.status(409).json({
            status: 409,
            code: 'DUPLICATE_ENTRY',
            message: '数据已被使用或记录已存在',
        });
    }
    // 4. JWT 签名/验证异常
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 401,
            code: 'INVALID_TOKEN',
            message: 'Token 校验失败或已过期',
        });
    }
    // 5. 未知的系统级致命异常 (500)
    logger_1.logger.error({ err }, '🔥 [Unhandled Error]');
    return res.status(500).json({
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map