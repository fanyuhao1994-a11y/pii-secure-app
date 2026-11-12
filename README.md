# PII Secure App — Enterprise-Grade Privacy & Data Protection Service

A production-ready Node.js & TypeScript backend service engineered to store, search, and audit Personally Identifiable Information (PII) under zero-trust security principles.

---

## System Architecture & Cryptographic Data Flow

```mermaid
flowchart LR
    Client([Client / API Consumer]) -->|HTTPS / TLS 1.3| Caddy[Caddy Reverse Proxy :443]
    Caddy -->|Internal Docker Network| API[Express API :3000]

    subgraph Security Layer
        API --> Auth[JWT Auth & RBAC]
        API --> RateLimit[Express Rate Limiter]
        API --> Zod[Zod Schema Validation]
    end

    subgraph Cryptographic Engine
        Auth --> AES[AES-256-GCM Encryption]
        Auth --> HMAC[HMAC-SHA256 Blind Index]
        Auth --> Argon2[Argon2 Password Hashing]
        Auth --> Mask[Dynamic PII Masking]
    end

    AES & HMAC & Argon2 -->|Internal Network Only| DB[(PostgreSQL 16)]
    Mask --> Audit[(Audit Logs Table)]
    DB -.->|Daily Cron pg_dump| Backup[(Encrypted Gzip Backups)]
npm ci

