import express from 'express';
import { runMigrations } from './db/migrator';
import userRouter from './modules/user/user.router';

const app = express();
app.use(express.json());
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
    // 1. 优先执行数据库自动迁移
    await runMigrations();

    // 2. 迁移完成后启动端口监听
    const PORT = process.env.PORT || 3000;
    return app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('💥 Failed to start application:', error);
    process.exit(1);
  }
}

// 仅在非测试环境下（直接运行该文件时）自动启动服务器
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// 👈 导出 app 供 Supertest 单元测试使用，解决 TS1192 报错
export default app;