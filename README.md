# PII Secure App — Enterprise-Grade Privacy & Data Protection Service

A production-ready Node.js & TypeScript backend service engineered to store, search, rotate, and audit Personally Identifiable Information (PII) under zero-trust and defense-in-depth security principles.

> **Live Interactive API Docs (Swagger / OpenAPI 3.0):** [`https://3.26.15.122.sslip.io/api-docs`](https://3.26.15.122.sslip.io/api-docs) (OpenAPI JSON spec available at `/api-docs.json`)

---

## System Architecture & Cryptographic Data Flow

```mermaid
flowchart LR
    Client([Client / Swagger UI]) -->|HTTPS / TLS 1.3| Caddy[Caddy Reverse Proxy :443<br/>HSTS + Log Redaction]

    subgraph Frontend_Net [Frontend Bridge Network]
        Caddy -->|Proxy + /healthz Gate| API[Express API :3000<br/>Non-Root + Read-Only FS]
    end

    subgraph Security_Layer [Application Security & Observability]
        API --> Auth[JWT Auth & RBAC]
        API --> RateLimit[Express Rate Limiter]
        API --> Zod[Zod Schema Validation]
        API -.->|Redacted Events| Sentry[Sentry Error Tracking]
    end

    subgraph Crypto_Engine [Multi-Version Key-Ring Engine]
        Auth --> AES[AES-256-GCM Envelope<br/>v1 / v2 Key-Ring]
        Auth --> HMAC[HMAC-SHA256 Blind Index<br/>v1 / v2 Salt-Ring]
        Auth --> Argon2[Argon2id Password Hashing]
        Auth --> Mask[DTO Sanitization & RBAC Masking]
    end

    subgraph Backend_Internal [Isolated Internal Network - No External Access]
        AES --> DB[(PostgreSQL 16)]
        HMAC --> DB
        Argon2 --> DB
        Mask --> Audit[(Audit Logs Table)]
    end

    DB -.->|pg_dump + gzip + AES-256-CBC| Backup[(Encrypted Off-Site Backups)]
    Backup -.->|Sandbox Restore Drill| Sandbox[(Ephemeral Verification DB)]