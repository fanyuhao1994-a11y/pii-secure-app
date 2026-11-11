import express from 'express';
import * as Sentry from '@sentry/node';
import userRouter from './modules/user/user.router';
import { autoMaskMiddleware } from './middlewares/privacy';

const app = express();

// 1. 初始化 Sentry（测试环境自动禁用，避免模拟崩溃污染看板）
if (process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 1.0,
  });
}

// 2. 基础解析与安全脱敏中间件
app.use(express.json());
app.use(autoMaskMiddleware);

// 3. 业务路由（匹配测试套件的 /api/v1/users）
app.use('/api/v1/users', userRouter);

// 根路由健康检查
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PII Secure App API Ready' });
});

// 4. 异常处理中间件
Sentry.setupExpressErrorHandler(app);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    status: statusCode,
    message: err.message || 'Internal Server Error',
  });
});

// 5. 仅在非测试环境下监听端口
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

export default app;