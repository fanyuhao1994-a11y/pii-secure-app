"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * 校验 JWT Token 并解析用户角色注入 req.user
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // 获取 Bearer <token>
    if (!token) {
        return res.status(401).json({ code: 401, message: '未提供 Token，请先登录' });
    }
    try {
        const secret = process.env.JWT_SECRET || 'fallback_secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // 将解析出的身份挂载到 req.user，privacy.ts 脱敏中间件会自动读取 req.user.role
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ code: 403, message: 'Token 无效或已过期' });
    }
}
//# sourceMappingURL=auth.js.map