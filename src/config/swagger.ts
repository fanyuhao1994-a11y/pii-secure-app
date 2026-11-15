import { OpenAPIV3 } from 'openapi-types';

export const swaggerDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'PII Secure App API',
    version: '1.0.0',
    description:
      '零信任个人敏感信息（PII）保护服务接口文档：支持 AES-256-GCM 密钥环信封加密、HMAC-SHA256 盲索引检索、动态响应脱敏、JWT 鉴权与不可篡改审计日志。',
  },
  servers: [
    {
      url: '/',
      description: '当前运行环境（自动适配本地开发或线上 HTTPS 域名）',
    },
  ],
  tags: [
    { name: 'Auth', description: '身份认证与 JWT 令牌签发' },
    { name: 'Users', description: '用户注册、盲索引精准检索与个人档案' },
    { name: 'Audit', description: '敏感数据操作审计日志' },
    { name: 'System', description: '服务状态与数据库连通性探针' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '调用登录后获取的 token，点击右上角 Authorize 填入即可（无需手动加 Bearer 前缀）',
      },
    },
    schemas: {
      RegisterUserRequest: {
        type: 'object',
        required: ['nickname', 'phone', 'email'],
        properties: {
          nickname: {
            type: 'string',
            minLength: 2,
            example: 'Norman',
            description: '用户昵称（至少 2 个字符）',
          },
          phone: {
            type: 'string',
            pattern: '^1[3-9]\\d{9}$',
            example: '13800138000',
            description: '中国大陆 11 位手机号（入库时加密存储并生成盲索引）',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'norman@example.com',
            description: '电子邮箱（入库时加密存储并生成盲索引）',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'StrongPassword123!',
            description: '登录密码（至少 6 位，可选，使用 Argon2id 哈希存储）',
          },
          role: {
            type: 'string',
            enum: ['MEMBER', 'ADMIN'],
            default: 'MEMBER',
            example: 'MEMBER',
            description: '用户角色（MEMBER 普通用户 / ADMIN 管理员）',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['phone', 'password'],
        properties: {
          phone: {
            type: 'string',
            pattern: '^1[3-9]\\d{9}$',
            example: '13800138000',
            description: '注册手机号（后台自动转换为盲索引候选哈希匹配）',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'StrongPassword123!',
            description: '登录密码',
          },
        },
      },
    },
  },
  paths: {
    '/api/v1/users': {
      post: {
        tags: ['Users'],
        summary: '注册新用户（PII 自动加密 + 盲索引写入）',
        description: '明文手机号和邮箱在进入数据库前自动使用当前激活密钥版本加密，响应返回自动脱敏后的数据。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterUserRequest' },
            },
          },
        },
        responses: {
          '201': { description: '创建成功，返回脱敏后的用户信息' },
          '400': { description: '请求参数 Zod 校验失败' },
          '409': { description: '手机号或邮箱已存在（盲索引冲突）' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '手机号密码登录（盲索引检索）',
        description: '通过 HMAC-SHA256 多版本盲索引定位用户并校验 Argon2 密码，签发 JWT 并记录登录审计日志。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': { description: '登录成功，返回 JWT Token' },
          '400': { description: '参数格式错误' },
          '401': { description: '手机号或密码错误' },
        },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: '获取当前登录用户档案',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '返回当前用户档案信息' },
          '401': { description: '未提供或无效的 JWT Token' },
        },
      },
    },
    '/api/v1/users/search': {
      get: {
        tags: ['Users'],
        summary: '通过盲索引精确检索用户',
        description: '支持按完整手机号或完整邮箱进行 O(1) 哈希索引检索（不暴露明文索引）。',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'phone',
            in: 'query',
            required: false,
            schema: { type: 'string', example: '13800138000' },
            description: '要检索的完整 11 位手机号',
          },
          {
            name: 'email',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'norman@example.com' },
            description: '要检索的完整邮箱地址',
          },
        ],
        responses: {
          '200': { description: '返回匹配到的用户列表（经过脱敏策略处理）' },
          '401': { description: '未授权访问' },
        },
      },
    },
    '/api/v1/audit-logs': {
      get: {
        tags: ['Audit'],
        summary: '查询敏感操作审计日志',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: '返回审计日志记录列表' },
          '401': { description: '未授权访问' },
          '403': { description: '权限不足（仅 ADMIN 角色可查看审计日志）' },
        },
      },
    },
    '/healthz': {
      get: {
        tags: ['System'],
        summary: '健康检查与 PostgreSQL 连通性探针',
        responses: {
          '200': { description: '服务与数据库连接正常' },
          '503': { description: '数据库连接异常' },
        },
      },
    },
  },
};