import express from "express";
import * as Sentry from "@sentry/node";

const app = express();

// 1. 初始化 Sentry（必须放置在所有代码最前列）
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
  tracesSampleRate: 1.0, // 采样率 100%
});

// 基础中间件解析
app.use(express.json());

// ---------------- 你的业务路由定义 ----------------
// app.use("/api/users", userRoutes);

// 测试 Sentry 告警的临时接口（验证后可删除）
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("Sentry 生产环境测试异常！");
});

// 2. 挂载 Sentry 错误捕获中间件（必须放在所有业务路由之后，自定义 error handler 之前）
Sentry.setupExpressErrorHandler(app);

// 3. 自定义错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;

// 启动端口监听，保持 Node.js 进程持续运行
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 Debug route available at http://localhost:${PORT}/debug-sentry`);
});

// 补齐根路由，用于健康检查
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PII Secure App API Ready' });
});

export default app;