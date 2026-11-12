import { z } from 'zod';

export const LoginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码长度不能少于 6 位'),
});
