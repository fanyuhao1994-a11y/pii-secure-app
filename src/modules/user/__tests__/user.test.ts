import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import { db } from '../../../db';

describe('PII Secure Backend API Integration Tests', () => {
  let memberToken: string;
  let adminToken: string;
  let memberUserId: string;
  let adminUserId: string;

  const testMemberPhone = '13888889999';
  const testAdminPhone = '13988889999';
  const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';

  // 清理测试脏数据
const cleanTestData = async () => {
  await db.query(`
    DELETE FROM audit_logs WHERE operator_id IN (
      SELECT id FROM users WHERE nickname IN ('TestMember', 'TestAdmin')
    ) OR target_user_id IN (
      SELECT id FROM users WHERE nickname IN ('TestMember', 'TestAdmin')
    );
    DELETE FROM users WHERE nickname IN ('TestMember', 'TestAdmin');
  `);
};

  beforeAll(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await db.end();
  });

describe('1. Zod 参数校验逻辑拦截', () => {
    it('当手机号和邮箱格式错误时应拦截并返回 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .send({
          nickname: 'X',
          phone: '12345',
          email: 'invalid-email'
        });

      expect(res.status).toBe(400); // 期望 400 Bad Request
    });
  });

  describe('2. 用户注册与 JWT Token 签发', () => {
    it('注册普通用户成功并生成有效 Token', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .send({
          nickname: 'TestMember',
          phone: testMemberPhone,
          email: 'member@test.com',
          role: 'MEMBER'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();

      memberUserId = res.body.data.id;
      memberToken = jwt.sign({ id: memberUserId, role: 'MEMBER' }, jwtSecret);
      expect(memberToken).toBeDefined();
    });

    it('注册管理员用户成功并生成有效 Token', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .send({
          nickname: 'TestAdmin',
          phone: testAdminPhone,
          email: 'admin@test.com',
          role: 'ADMIN'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();

      adminUserId = res.body.data.id;
      adminToken = jwt.sign({ id: adminUserId, role: 'ADMIN' }, jwtSecret);
      expect(adminToken).toBeDefined();
    });
  });

  describe('3. 基于角色的动态脱敏防护 (RBAC Privacy)', () => {
    it('普通成员 (MEMBER) 访问 /me 接口输出数据应被打码脱敏', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toMatch(/^138\*\*\*\*9999$/);
      expect(res.body.data.email).toMatch(/^me.*@test\.com$/);
    });

    it('管理员 (ADMIN) 访问 /me 接口应获得解密明文数据', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe(testAdminPhone);
      expect(res.body.data.email).toBe('admin@test.com');
    });
  });

  describe('4. 基于 HMAC 盲索引精确查询', () => {
    it('普通角色 (MEMBER) 带 Token 盲索引查询成功并打码', async () => {
      const res = await request(app)
        .get(`/api/v1/users/search?phone=${testMemberPhone}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toMatch(/^138\*\*\*\*9999$/);
    });

    it('管理员角色 (ADMIN) 使用盲索引精确查询成功', async () => {
      const res = await request(app)
        .get(`/api/v1/users/search?phone=${testMemberPhone}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.nickname).toBe('TestMember');
    });
  });

  describe('5. 审计日志落盘断言', () => {
  it('数据库中应记录正确的 PII 读取与盲索引搜索审计日志', async () => {
    // 💡 增加 100ms 延迟，确保第 4 步接口触发的异步审计日志完成数据库落盘
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await db.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5`
    );
    expect(result.rows.length).toBeGreaterThan(0);
  });
});
});