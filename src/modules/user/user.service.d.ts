export interface CreateUserDto {
    nickname: string;
    phone: string;
    email: string;
    password?: string;
    role?: string;
}
export declare class UserService {
    createUser(dto: CreateUserDto): Promise<any>;
    searchUserByPhone(phone: string, operator?: any): Promise<{
        id: any;
        nickname: any;
        phone: string;
        email: string;
        role: any;
    } | null>;
    getUserById(userId: string, operator?: any): Promise<{
        id: any;
        nickname: any;
        phone: string;
        email: string;
        role: any;
    } | null>;
}
//# sourceMappingURL=user.service.d.ts.map