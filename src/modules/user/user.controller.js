"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("./user.service");
const AppError_1 = require("../../errors/AppError");
class UserController {
    userService;
    constructor() {
        this.userService = new user_service_1.UserService();
    }
    // 1. 用户注册
    async register(req, res, next) {
        try {
            const user = await this.userService.createUser(req.body);
            return res.status(201).json({ status: 201, data: user });
        }
        catch (err) {
            next(err); // 投递给全局错误处理中间件
        }
    }
    // 2. 获取个人档案
    async getProfile(req, res, next) {
        try {
            const operator = req.user;
            const user = await this.userService.getUserById(operator.id, operator);
            if (!user) {
                throw new AppError_1.NotFoundError('用户不存在');
            }
            return res.status(200).json({ status: 200, data: user });
        }
        catch (err) {
            next(err);
        }
    }
    // 3. 盲索引精确搜索
    async search(req, res, next) {
        try {
            const phone = req.query.phone;
            if (!phone) {
                throw new AppError_1.AppError('缺少 phone 查询参数', 400);
            }
            const operator = req.user;
            const user = await this.userService.searchUserByPhone(phone, operator);
            if (!user) {
                throw new AppError_1.NotFoundError('未找到对应用户');
            }
            return res.status(200).json({ status: 200, data: user });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map