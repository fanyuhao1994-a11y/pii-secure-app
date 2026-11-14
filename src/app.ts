import express from 'express';
import * as Sentry from '@sentry/node';
import userRouter from './modules/user/user.router';
import authRouter from './modules/auth/auth.router';
import auditRouter from './modules/audit/audit.router';
import { autoMaskMiddleware } from './middlewares/privacy';
import { db } from './db';

const app = express();

// 1. 安全基础设置：信任前方 1 层代理（Caddy）以获取真实用户 IP，并隐藏 Express 指纹
app.set('trust proxy', 1);
app.disable('x-powered-by');

// 2. 初始化 Sentry（测试环境自动禁用，并在发送前剥离敏感请求头与请求体）
if (process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 1.0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        // 若报错附带了原始请求体，统一替换为脱敏占位符，防止明文 PII 传入 Sentry
        if (event.request.data) {
          event.request.data = '[REDACTED_PII_PAYLOAD]';
        }
      }
      return event;
    },
  });
}

// 3. 基础解析（显式限制 JSON 体积上限）与安全脱敏中间件
app.use(express.json({ limit: '100kb' }));
app.use(autoMaskMiddleware);

// 4. 业务路由
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/audit-logs', auditRouter);

// 根路由健康检查
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PII Secure App API Ready' });
});

app.get('/healthz', async (req, res) => {
  try {
    // 1. 探测 PostgreSQL 数据库真实连通性
    await db.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
    });
  }
});

// 5. 异常处理中间件
Sentry.setupExpressErrorHandler(app);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    status: statusCode,
    message: err.message || 'Internal Server Error',
  });
});

// 6. 仅在非测试环境下监听端口
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

export default app;