# PII Secure App — Enterprise-Grade Privacy & Data Protection Service

A production-ready Node.js & TypeScript backend service engineered to store, search, and audit Personally Identifiable Information (PII) under zero-trust and defense-in-depth security principles.

---

## System Architecture & Cryptographic Data Flow

```mermaid
flowchart LR
    Client([Client / API Consumer]) -->|HTTPS / TLS 1.3| Caddy[Caddy Reverse Proxy :443<br/>HSTS + Log Redaction]

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
        Auth --> Mask[Dynamic PII Masking]
    end

    subgraph Backend_Internal [Isolated Internal Network - No External Access]
        AES --> DB[(PostgreSQL 16)]
        HMAC --> DB
        Argon2 --> DB
        Mask --> Audit[(Audit Logs Table)]
    end

    DB -.->|pg_dump + gzip + AES-256-CBC| Backup[(Encrypted Off-Site Backups)]
    Backup -.->|Sandbox Restore Drill| Sandbox[(Ephemeral Verification DB)]
```

---

## Core Security Architecture

| Security Domain | Implementation Details | Threat Mitigated |
| :--- | :--- | :--- |
| **Encryption at Rest & Key Rotation** | **AES-256-GCM** with unique random IVs, auth tags, and versioned **Key-Ring (`v1`, `v2`, ...)** prefixes per field (`phone`, `email`). | Database dumps reveal zero plaintext PII; supports zero-downtime key rotation without re-encrypting legacy rows upfront. |
| **Searchable Encryption** | **HMAC-SHA256 Blind Indexing** using versioned server-side salts (`PII_BLIND_INDEX_SALTS`). | Enables $O(1)$ indexed exact-match queries without decrypting records, with seamless salt rotation support. |
| **Credential Storage** | **Argon2** memory-hard password hashing. | Protects user credentials against GPU/ASIC brute-force attacks. |
| **RBAC & Dynamic Masking** | Middleware-enforced role evaluation (`ADMIN` vs `MEMBER`). `MEMBER` receives masked PII; `ADMIN` receives decrypted values. | Prevents horizontal privilege escalation and over-exposure of sensitive fields. |
| **Edge & Log Hygiene** | **Caddy 2** automatic HTTPS (`sslip.io`), strict security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`), 1MB body limit, and automatic stripping of `uri_query`, `Authorization`, and `Cookie` headers from access logs. | Eliminates MITM sniffing, clickjacking, and accidental PII leakage via URL query strings or error logs. |
| **Error Payload Redaction** | **Sentry SDK** configured with `beforeSend` hooks to scrub cookies, auth headers, and raw request bodies (`[REDACTED_PII_PAYLOAD]`). | Prevents unhandled exceptions from leaking plaintext PII into third-party observability dashboards. |
| **Compliance Auditing** | Asynchronous immutable logging to `audit_logs` on every `USER_LOGIN` and `PII_READ` event (with `trust proxy` real client IP resolution). | Full forensic traceability of who accessed whose plaintext PII, from which IP, and when. |

---

## DevSecOps & Production Operations

- **Hardened Container Runtime**:
  - Multi-stage Docker build running under an unprivileged `node` user (`USER node`).
  - **Read-Only Root Filesystem** (`read_only: true` with volatile `tmpfs` mounts) and `no-new-privileges:true` to block runtime binary tampering or webshell persistence.
  - **Dual-Network Physical Isolation**: PostgreSQL resides exclusively on an `internal: true` Docker network, completely unreachable from the reverse proxy or public internet.
- **Deep Readiness Probe (`/healthz`)**: Verifies active PostgreSQL connectivity (`SELECT 1`) before Docker/Caddy routes production traffic to the API container.
- **4-Stage CI/CD Security Pipeline (GitHub Actions)**:
  1. **Secret Leak Detection**: Scans full commit history with **Gitleaks** to block accidental credential commits.
  2. **Integration & Crypto Gate**: Spins up an ephemeral PostgreSQL 16 service container and enforces Jest test & coverage thresholds alongside `npm audit`.
  3. **Container Vulnerability Scan**: Builds the production image and scans OS/library dependencies with **Trivy** (`CRITICAL`, `HIGH` severity) before pushing to GHCR.
  4. **Automated EC2 Deployment**: Deploys verified builds to AWS EC2 over SSH with automatic orphaned container and dangling image cleanup.
- **Encrypted Disaster Recovery & Automated Drills**:
  - `scripts/backup-db.sh`: Streams `pg_dump | gzip` directly into **OpenSSL AES-256-CBC (PBKDF2, 100k iterations)** encryption without writing unencrypted temporary files to disk, enforcing a 7-day rolling retention policy.
  - `scripts/verify-restore.sh`: Spins up an isolated ephemeral PostgreSQL sandbox container, decrypts the latest archive, restores the schema/data, and verifies table integrity before self-destructing.

---

## API Reference

| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | Lightweight liveness check |
| `GET` | `/healthz` | Public | Deep readiness probe (verifies live PostgreSQL connectivity) |
| `POST` | `/api/v1/users` | Public (Rate-Limited) | Register user with versioned AES-256-GCM PII & Argon2 password hash |
| `POST` | `/api/v1/auth/login` | Public (Rate-Limited) | Authenticate via blind-indexed phone + password; issues 24h JWT |
| `GET` | `/api/v1/users/me` | Bearer JWT | Retrieve current user profile (masked for `MEMBER`, plaintext for `ADMIN`) |
| `GET` | `/api/v1/users/search?phone=...` | Bearer JWT | Exact-match search via HMAC blind index + RBAC output masking |
| `GET` | `/api/v1/audit-logs?limit=20&offset=0` | Bearer JWT (`ADMIN`) | Paginated compliance audit trail (`403 Forbidden` for `MEMBER`) |

---

## Local Development, Deployment & Backup Drills

### 1. Environment Configuration (`.env`)

Generate cryptographically strong 64-character hex keys (`openssl rand -hex 32`) and configure `.env`:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/pii_db

# Docker PostgreSQL Credentials
DB_USER=postgres
DB_PASSWORD=postgrespassword
DB_NAME=pii_secure_db

# Multi-Version Key-Ring (Supports v1,v2,... comma-separated rotation)
PII_ENCRYPTION_KEYS=v1:<64_char_hex_key>
ACTIVE_ENCRYPTION_KEY_VERSION=v1

PII_BLIND_INDEX_SALTS=v1:<64_char_hex_salt>
ACTIVE_BLIND_INDEX_SALT_VERSION=v1

# Auth & Backup Encryption
JWT_SECRET=<64_char_hex_secret>
BACKUP_ENCRYPTION_PASSWORD=<64_char_hex_backup_password>
```

### 2. Testing & Full-Stack Container Execution

```bash
# Install dependencies & run full integration/crypto test suite
npm ci
npm test

# Launch hardened production stack (Caddy + Read-Only API + Isolated Postgres)
docker compose up -d --build
```

### 3. Encrypted Backup & Restore Verification

```bash
chmod +x scripts/backup-db.sh scripts/verify-restore.sh

# Create an AES-256-CBC encrypted database backup in ./backups
./scripts/backup-db.sh

# Spin up an ephemeral sandbox DB to verify decryption & restore integrity
./scripts/verify-restore.sh
```