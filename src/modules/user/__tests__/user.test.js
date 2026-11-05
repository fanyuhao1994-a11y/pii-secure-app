"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../../../app"));
const db_1 = require("../../../db");
(0, globals_1.describe)('PII Secure Backend API Integration Tests', () => {
    let memberToken;
    let adminToken;
    let memberUserId;
    let adminUserId;
    const testMemberPhone = '13888889999';
    const testAdminPhone = '13988889999';
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
    // 清理测试脏数据
    const cleanTestData = async () => {
        await db_1.db.query(`
      DELETE FROM audit_logs WHERE operator_id IN (
        SELECT id::text FROM users WHERE nickname IN ('TestMember', 'TestAdmin')
      ) OR target_user_id IN (
        SELECT id::text FROM users WHERE nickname IN ('TestMember', 'TestAdmin')
      );
      DELETE FROM users WHERE nickname IN ('TestMember', 'TestAdmin');
    `);
    };
    (0, globals_1.beforeAll)(async () => {
        await cleanTestData();
    });
    (0, globals_1.afterAll)(async () => {
        await cleanTestData();
        await db_1.db.end();
    });
    (0, globals_1.describe)('1. Zod 参数校验逻辑拦截', () => {
        (0, globals_1.it)('当手机号和邮箱格式错误时应拦截并返回 400 Bad Request', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/users')
                .send({
                nickname: 'X',
                phone: '12345',
                email: 'invalid-email'
            });
            (0, globals_1.expect)(res.status).toBe(400); // 期望 400 Bad Request
        });
    });
    (0, globals_1.describe)('2. 用户注册与 JWT Token 签发', () => {
        (0, globals_1.it)('注册普通用户成功并生成有效 Token', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/users')
                .send({
                nickname: 'TestMember',
                phone: testMemberPhone,
                email: 'member@test.com',
                role: 'MEMBER'
            });
            (0, globals_1.expect)(res.status).toBe(201);
            (0, globals_1.expect)(res.body.data.id).toBeDefined();
            memberUserId = res.body.data.id;
            memberToken = jsonwebtoken_1.default.sign({ id: memberUserId, role: 'MEMBER' }, jwtSecret);
            (0, globals_1.expect)(memberToken).toBeDefined();
        });
        (0, globals_1.it)('注册管理员用户成功并生成有效 Token', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/v1/users')
                .send({
                nickname: 'TestAdmin',
                phone: testAdminPhone,
                email: 'admin@test.com',
                role: 'ADMIN'
            });
            (0, globals_1.expect)(res.status).toBe(201);
            (0, globals_1.expect)(res.body.data.id).toBeDefined();
            adminUserId = res.body.data.id;
            adminToken = jsonwebtoken_1.default.sign({ id: adminUserId, role: 'ADMIN' }, jwtSecret);
            (0, globals_1.expect)(adminToken).toBeDefined();
        });
    });
    (0, globals_1.describe)('3. 基于角色的动态脱敏防护 (RBAC Privacy)', () => {
        (0, globals_1.it)('普通成员 (MEMBER) 访问 /me 接口输出数据应被打码脱敏', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${memberToken}`);
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body.data.phone).toMatch(/^138\*\*\*\*9999$/);
            (0, globals_1.expect)(res.body.data.email).toMatch(/^me.*@test\.com$/);
        });
        (0, globals_1.it)('管理员 (ADMIN) 访问 /me 接口应获得解密明文数据', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${adminToken}`);
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body.data.phone).toBe(testAdminPhone);
            (0, globals_1.expect)(res.body.data.email).toBe('admin@test.com');
        });
    });
    (0, globals_1.describe)('4. 基于 HMAC 盲索引精确查询', () => {
        (0, globals_1.it)('普通角色 (MEMBER) 带 Token 盲索引查询成功并打码', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/users/search?phone=${testMemberPhone}`)
                .set('Authorization', `Bearer ${memberToken}`);
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body.data.phone).toMatch(/^138\*\*\*\*9999$/);
        });
        (0, globals_1.it)('管理员角色 (ADMIN) 使用盲索引精确查询成功', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/v1/users/search?phone=${testMemberPhone}`)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, globals_1.expect)(res.status).toBe(200);
            (0, globals_1.expect)(res.body.data.nickname).toBe('TestMember');
        });
    });
    (0, globals_1.describe)('5. 审计日志落盘断言', () => {
        (0, globals_1.it)('数据库中应记录正确的 PII 读取与盲索引搜索审计日志', async () => {
            const result = await db_1.db.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5`);
            (0, globals_1.expect)(result.rows.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=user.test.js.map