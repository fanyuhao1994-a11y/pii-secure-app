import express from 'express';
import { runMigrations } from './db/migrator'; // 👈 导入 Migration 执行器

const app = express();

// ...（其他中间件和路由配置，如 app.use(express.json()) 等）...

async function startServer() {
  try {
    // 1. 优先执行数据库自动迁移（建表与更新索引）
    await runMigrations();

    // 2. 迁移完成后，再启动 Express 服务监听端口
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('💥 Failed to start application:', error);
    process.exit(1);
  }
}

startServer();