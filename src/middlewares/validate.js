"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const zod_1 = require("zod");
/**
 * 通用 Zod 参数校验中间件 (TS 严格模式优化版)
 */
function validateRequest(schema) {
    return async (req, res, next) => {
        try {
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            if (schema.query) {
                const parsedQuery = await schema.query.parseAsync(req.query);
                // 显式转类型以符合 Express req.query 的 ParsedQs 接口
                req.query = parsedQuery;
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    code: 400,
                    message: '请求参数校验失败',
                    errors: error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
}
//# sourceMappingURL=validate.js.map