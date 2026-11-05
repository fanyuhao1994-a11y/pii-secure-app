import { z } from 'zod';
export declare const CreateUserSchema: z.ZodObject<{
    nickname: z.ZodString;
    phone: z.ZodString;
    email: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        MEMBER: "MEMBER";
        ADMIN: "ADMIN";
    }>>>;
}, z.core.$strip>;
//# sourceMappingURL=user.schema.d.ts.map