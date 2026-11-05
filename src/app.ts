import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import './config/env';
import userRouter from './modules/user/user.router';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// 挂载路由：同时兼容带 /api/v1/users 前缀和不带前缀的测试请求
app.use('/api/v1/users', userRouter);
app.use('/users', userRouter);
app.use('/', userRouter);

export default app;