import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import './config/env';
import userRouter from './modules/user/user.router';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// 路由挂载
app.use('/api/v1/users', userRouter);
app.use('/users', userRouter);
app.use('/', userRouter);

// 1. 404 兜底 (必须在所有路由之后)
app.use(notFoundHandler);

// 2. 全局错误处理中间件 (必须放在最后)
app.use(errorHandler);

export default app;