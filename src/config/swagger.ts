import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PII Secure Node.js API Service',
      version: '1.0.0',
      description: '包含 PII 加密、HMAC 盲索引检索、RBAC 动态脱敏与审计日志的高安全 Backend API',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.router.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);