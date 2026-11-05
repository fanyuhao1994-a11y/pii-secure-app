"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_1 = require("../../middlewares/auth");
const validate_1 = require("../../middlewares/validate"); // 引入你的 validateRequest
const user_schema_1 = require("./user.schema");
const rateLimiter_1 = require("../../middlewares/rateLimiter");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
// 1. 注册接口：注意这里用 { body: CreateUserSchema }
router.post('/', rateLimiter_1.authLimiter, (0, validate_1.validateRequest)({ body: user_schema_1.CreateUserSchema }), userController.register.bind(userController));
// 2. 盲索引搜索接口
router.get('/search', rateLimiter_1.apiLimiter, auth_1.authenticateToken, userController.search.bind(userController));
// 3. 个人档案接口
router.get('/me', rateLimiter_1.apiLimiter, auth_1.authenticateToken, userController.getProfile.bind(userController));
exports.default = router;
//# sourceMappingURL=user.router.js.map