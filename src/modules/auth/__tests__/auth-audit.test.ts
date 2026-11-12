import request from 'supertest';
import app from '../../../app';
import { db } from '../../../db';
import { runMigrations } from '../../../db/migrator';

describe('Auth & Audit Logs Integration Tests', () => {
  const adminPhone = '13900008888';
  const memberPhone = '13900007777';
  const password = 'StrongPassword123!';
  let adminToken = '';
  let memberToken = '';

  beforeAll(async () => {
    await runMigrations();
    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM users');

    await request(app).post('/api/v1/users').send({
      nickname: 'SecAdmin',
      phone: adminPhone,
      email: 'admin@example.com',
      password,
      role: 'ADMIN',
    });

    await request(app).post('/api/v1/users').send({
      nickname: 'SecMember',
      phone: memberPhone,
      email: 'member@example.com',
      password,
      role: 'MEMBER',
    });
  });

  afterAll(async () => {
    await db.end();
  });

  it('should reject login with non-existent phone or wrong password', async () => {
    const res1 = await request(app).post('/api/v1/auth/login').send({
      phone: '13900009999',
      password,
    });
    expect(res1.status).toBe(401);

    const res2 = await request(app).post('/api/v1/auth/login').send({
      phone: adminPhone,
      password: 'WrongPassword999!',
    });
    expect(res2.status).toBe(401);
  });

  it('should login successfully and return JWT tokens for ADMIN and MEMBER', async () => {
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      phone: adminPhone,
      password,
    });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.token).toBeDefined();
    adminToken = adminRes.body.data.token;

    const memberRes = await request(app).post('/api/v1/auth/login').send({
      phone: memberPhone,
      password,
    });
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.data.token).toBeDefined();
    memberToken = memberRes.body.data.token;
  });

  it('should block unauthenticated or MEMBER access to /api/v1/audit-logs', async () => {
    const noAuthRes = await request(app).get('/api/v1/audit-logs');
    expect(noAuthRes.status).toBe(401);

    const memberRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberRes.status).toBe(403);
  });

  it('should allow ADMIN to query paginated audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?limit=10&offset=0')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
