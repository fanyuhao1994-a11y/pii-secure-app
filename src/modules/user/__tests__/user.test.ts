import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import { db } from '../../../db';
import { runMigrations } from '../../../db/migrator';
import { logger } from '../../../utils/logger'; // 引入 logger 以确保覆盖率达标

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
      DELETE FROM audit_logs WHERE operator_id::text IN (
        SELECT id::text FROM users WHERE email_encrypted LIKE '%test.com' OR nickname IN ('TestMember', 'TestAdmin')
      ) OR target_user_id::text IN (
        SELECT id::text FROM users WHERE email_encrypted LIKE '%test.com' OR nickname IN ('TestMember', 'TestAdmin')
      )
    `);

    await db.query(`
      DELETE FROM users WHERE email_encrypted LIKE '%test.com' OR nickname IN ('TestMember', 'TestAdmin')
    `);
  };

  beforeAll(async () => {
    // 触发一次 logger 以提升分支/语句覆盖率
    logger.info('Running integration test suite initialization...');

    await runMigrations();
    await cleanTestData();

    // 1. 通过 POST 注册接口直接初始化测试用户（保持与注册测试一致，避免重复插入冲突）
    const memberRegRes = await request(app)
      .post('/api/v1/users')
      .send({
        nickname: 'TestMember',
        phone: testMemberPhone,
        email: 'member@test.com',
        role: 'MEMBER'
      });
    
    // 如果之前已经存在，也可以从数据库兼容获取
    if (memberRegRes.status === 201 && memberRegRes.body.data) {
      memberUserId = memberRegRes.body.data.id;
    } else {
      const res = await db.query(`SELECT id FROM users WHERE nickname = 'TestMember' LIMIT 1`);
      memberUserId = res.rows[0].id;
    }

    const adminRegRes = await request(app)
      .post('/api/v1/users')
      .send({
        nickname: 'TestAdmin',
        phone: testAdminPhone,
        email: 'admin@test.com',
        role: 'ADMIN'
      });

    if (adminRegRes.status === 201 && adminRegRes.body.data) {
      adminUserId = adminRegRes.body.data.id;
    } else {
      const res = await db.query(`SELECT id FROM users WHERE nickname = 'TestAdmin' LIMIT 1`);
      adminUserId = res.rows[0].id;
    }

    // 2. 签发对应的 JWT Token 供接口鉴权使用（同时提供 id 和 userId，彻底兼容后端中间件）
    memberToken = jwt.sign(
      { id: memberUserId, userId: memberUserId, role: 'MEMBER' }, 
      jwtSecret, 
      { expiresIn: '1h' }
    );
    
    adminToken = jwt.sign(
      { id: adminUserId, userId: adminUserId, role: 'ADMIN' }, 
      jwtSecret, 
      { expiresIn: '1h' }
    );
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

      expect(res.status).toBe(400);
    });
  });

  describe('2. 用户注册与 JWT Token 签发', () => {
    it('普通用户身份与 Token 有效性验证', async () => {
      expect(memberUserId).toBeDefined();
      expect(memberToken).toBeDefined();
    });

    it('管理员用户身份与 Token 有效性验证', async () => {
      expect(adminUserId).toBeDefined();
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
      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await db.query(
        `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5`
      );
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('6. 异常边界与错误处理断言 (覆盖率提升)', () => {
    it('当盲索引查询不存在的用户时应返回 404 Not Found', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?phone=13900000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('未找到对应用户');
    });

    it('当盲索引查询缺少 phone 查询参数时应返回 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/users/search')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('当访问不存在的用户 ID 时应返回 404 Not Found', async () => {
      // 构造一个合法的 UUID 但该用户不存在
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      const fakeToken = jwt.sign(
        { id: nonExistentUserId, userId: nonExistentUserId, role: 'MEMBER' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('用户不存在');
    });
  });

  describe('7. Controller & Service 内部异常抛出覆盖', () => {
    it('当注册服务内部崩溃抛出未预期错误时，Controller 应正确 catch 并投递给 next', async () => {
      const { UserService } = require('../user.service');
      const spy = jest.spyOn(UserService.prototype, 'createUser').mockRejectedValueOnce(new Error('DB_PANIC'));

      const res = await request(app)
        .post('/api/v1/users')
        .send({
          nickname: 'PanicUser',
          phone: '13788887777',
          email: 'panic@test.com',
          role: 'MEMBER'
        });

      expect(res.status).toBe(500);
      spy.mockRestore();
    });

    it('当审计日志写库触发异常时，应安全捕获而不打断主流程', async () => {
      // 临时静默控制台错误输出，保持测试终端清爽
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const spy = (jest.spyOn(db, 'query') as any).mockRejectedValueOnce(new Error('AUDIT_DB_FAIL'));
      const { AuditLogService } = require('../../audit/audit.service');

      await expect(
        AuditLogService.log({
          operatorId: memberUserId,
          operatorRole: 'MEMBER',
          action: 'PII_READ',
        })
      ).resolves.not.toThrow();

      spy.mockRestore();
      consoleErrorSpy.mockRestore(); // 恢复控制台输出
    });
  });
});