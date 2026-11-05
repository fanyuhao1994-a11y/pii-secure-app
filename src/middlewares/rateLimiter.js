"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const isTest = process.env.NODE_ENV === 'test';
// 1. 通用 API 限流
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skip: () => isTest, // 👈 测试环境自动跳过限流，防止测试套件被堵塞
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, error: '请求过于频繁，请稍后再试' },
});
// 2. 敏感接口严格限流
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skip: () => isTest, // 👈 测试环境自动跳过限流
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, error: '尝试注册或登录次数过多，请 15 分钟后再试' },
});
//# sourceMappingURL=rateLimiter.js.map