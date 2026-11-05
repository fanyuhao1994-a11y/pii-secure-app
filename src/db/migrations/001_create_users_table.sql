-- 启用 pgcrypto 扩展（用于生成标准 UUID 主键）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建用户表 (遵循 PII 安全设计规范)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(50) NOT NULL,
    
    -- 1. 手机号：存储 AES-256-GCM 密文 (iv:ciphertext:tag)
    phone_encrypted TEXT NOT NULL,
    -- 手机号盲索引：存储 HMAC-SHA256，用于 WHERE 精确查找
    phone_blind_index VARCHAR(64) NOT NULL,
    
    -- 2. 邮箱：存储 AES-256-GCM 密文
    email_encrypted TEXT NOT NULL,
    -- 邮箱盲索引：存储 HMAC-SHA256
    email_blind_index VARCHAR(64) NOT NULL,
    
    -- 权限角色 (ADMIN / AUDITOR / MEMBER)
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为盲索引字段创建高效 B-Tree 索引 (毫秒级定位数据，且不暴露明文)
CREATE INDEX IF NOT EXISTS idx_users_phone_blind ON users(phone_blind_index);
CREATE INDEX IF NOT EXISTS idx_users_email_blind ON users(email_blind_index);