import { z } from 'zod';

export const CreateUserSchema = z.object({
  nickname: z.string().min(2, '昵称至少 2 个字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6).optional(),
  role: z.enum(['MEMBER', 'ADMIN']).optional().default('MEMBER'),
});