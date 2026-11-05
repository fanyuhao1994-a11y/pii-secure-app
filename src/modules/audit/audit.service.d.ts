export interface LogAccessDto {
    operatorId: string;
    operatorRole: string;
    action: 'PII_READ' | 'BLIND_INDEX_SEARCH' | 'USER_REGISTER';
    targetUserId?: string;
    details?: Record<string, any>;
}
export declare class AuditLogService {
    /**
     * 异步记录 PII 审计日志
     */
    static log(dto: LogAccessDto): Promise<void>;
}
//# sourceMappingURL=audit.service.d.ts.map