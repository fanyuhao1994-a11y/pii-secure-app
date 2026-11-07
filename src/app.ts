import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { runMigrations } from './db/migrator';
import userRouter from './modules/user/user.router';

const app = express();

// 1. 设置 HTTP 安全响应头 (防护 XSS、Clickjacking 等)
app.use(helmet());

// 2. 配置代理支持（由于前置使用了 Nginx 反向代理）
app.set('trust proxy', 1);

// 3. 配置通用 API 限流：每个 IP 在 15 分钟内最多允许 100 次请求
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: 'Too many requests, please try again later.' },
});
app.use('/api/', globalLimiter);

// 4. 解析 JSON 请求体
app.use(express.json({ limit: '10kb' })); // 限制 Payload 大小，防御 DOS 攻击

app.use('/api/v1/users', userRouter);

app.get('/', (req, res) => {
  res.send('PII Secure Application standard API is up and running!');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'PII Secure Application service is healthy',
    timestamp: new Date().toISOString()
  });
});

export async function startServer() {
  try {
    await runMigrations();
    const PORT = process.env.PORT || 3000;
    return app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('💥 Failed to start application:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;