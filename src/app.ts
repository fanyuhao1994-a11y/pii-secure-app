import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import './config/env';
import userRouter from './modules/user/user.router';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// 挂载 Swagger API 文档 UI 界面
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 挂载业务路由
app.use('/api/v1/users', userRouter);
app.use('/users', userRouter);
app.use('/', userRouter);

// 全局错误处理
app.use(notFoundHandler);
app.use(errorHandler);

export default app;