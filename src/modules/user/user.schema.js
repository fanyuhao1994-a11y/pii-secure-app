"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserSchema = void 0;
const zod_1 = require("zod");
exports.CreateUserSchema = zod_1.z.object({
    nickname: zod_1.z.string().min(2, '昵称至少 2 个字符'),
    phone: zod_1.z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
    email: zod_1.z.string().email('邮箱格式不正确'),
    password: zod_1.z.string().min(6).optional(),
    role: zod_1.z.enum(['MEMBER', 'ADMIN']).optional().default('MEMBER'),
});
//# sourceMappingURL=user.schema.js.map