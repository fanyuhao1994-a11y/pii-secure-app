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
```

---

## Core Security Architecture

| Security Domain | Implementation Details | Threat Mitigated |
| :--- | :--- | :--- |
| **Encryption at Rest & Zero-Downtime Rotation** | **AES-256-GCM** with unique random IVs, auth tags, and versioned **Key-Ring (`v1`, `v2`, ...)** prefixes per field (`phone`, `email`), paired with transactional batch re-encryption (`scripts/rotate-keys.ts`). | Database dumps reveal zero plaintext PII; supports zero-downtime key rotation without blocking live traffic. |
| **Searchable Encryption** | **HMAC-SHA256 Blind Indexing** using versioned server-side salts (`PII_BLIND_INDEX_SALTS`). | Enables $O(1)$ indexed exact-match queries without decrypting records, with seamless multi-version salt rotation. |
| **Credential Storage** | **Argon2** memory-hard password hashing. | Protects user credentials against GPU/ASIC brute-force attacks. |
| **RBAC, DTO Sanitization & Dynamic Masking** | Strict response DTO projection strips raw ciphertext (`*_encrypted`) and blind indexes at the service boundary; middleware evaluates JWT role (`ADMIN` vs `MEMBER`) to serve masked PII to standard users and plaintext only to authorized admins. | Eliminates internal storage schema leakage, horizontal privilege escalation, and over-exposure of sensitive fields. |
| **Edge & Log Hygiene** | **Caddy 2** automatic HTTPS (`sslip.io`), strict security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`), 100KB Express JSON limit, and automatic stripping of `uri_query`, `Authorization`, and `Cookie` headers from access logs. | Eliminates MITM sniffing, clickjacking, payload flooding, and accidental PII leakage via URL query strings or access logs. |
| **Error Payload Redaction** | **Sentry SDK** configured with `beforeSend` hooks to scrub cookies, auth headers, and raw request bodies (`[REDACTED_PII_PAYLOAD]`). | Prevents unhandled exceptions from leaking plaintext PII into third-party observability dashboards. |
| **Compliance Auditing** | Immutable logging to `audit_logs` on `USER_LOGIN` and `PII_READ` events (with `trust proxy` real client IP resolution), restricted strictly to `ADMIN` role inspection. | Full forensic traceability of who accessed whose plaintext PII, from which IP, and when. |

---

## Infrastructure Hardening & DevSecOps Pipeline

- **Hardened AWS EC2 Host & Network Perimeter**:
  - **Zero-Exposure SSH (`Port 22`)**: Security Group restricts permanent SSH ingress strictly to operator static IP (`My IP`), eliminating background internet port-scan noise.
  - **SSH Daemon & Brute-Force Defense**: Hardened via `/etc/ssh/sshd_config.d/99-hardening.conf` (`PasswordAuthentication no`, `PermitRootLogin no`, `MaxAuthTries 3`) and active **Fail2Ban** jail monitoring.
  - **IMDSv2 Enforcement**: Instance metadata service requires session-oriented tokens (`HttpTokens: required`), mitigating SSRF credential theft vectors.
- **Hardened Container Runtime & Network Isolation**:
  - Multi-stage Docker build running as unprivileged `node` user (`USER node`) with a **Read-Only Root Filesystem** (`read_only: true` + volatile `tmpfs` mounts) and `no-new-privileges:true`.
  - PostgreSQL resides exclusively on an `internal: true` Docker network, physically unreachable from the reverse proxy or public internet.
  - Deep readiness probe (`/healthz`) verifies live PostgreSQL connectivity (`SELECT 1`) prior to traffic routing.
- **4-Stage CI/CD Pipeline with Ephemeral Firewall Access (GitHub Actions)**:
  1. **Secret Leak Detection**: Full git history scan via **Gitleaks** to block accidental credential commits.
  2. **Integration & Crypto Gate**: Ephemeral PostgreSQL 16 service container running Jest integration/crypto suites (97%+ statement coverage) and high-severity `npm audit`.
  3. **Container Vulnerability Scan**: Builds the production image and scans OS/library layers with **Trivy** (`CRITICAL`, `HIGH`) before publishing to GHCR.
  4. **Ephemeral-Ingress EC2 Deployment**: Uses a least-privilege IAM deployer policy (`ec2:AuthorizeSecurityGroupIngress` / `RevokeSecurityGroupIngress` scoped solely to the target Security Group) to temporarily whitelist the GitHub Runner's IPv4 `/32` for SSH deployment and **unconditionally revokes** the rule via `if: always()` upon completion.
- **Encrypted Disaster Recovery & Automated Drills**:
  - `scripts/backup-db.sh`: Streams `pg_dump | gzip` directly into **OpenSSL AES-256-CBC (PBKDF2, 100k iterations)** without writing plaintext temp files to disk, enforcing a 7-day rolling retention policy.
  - `scripts/verify-restore.sh`: Spins up an isolated ephemeral PostgreSQL sandbox container, decrypts the latest archive, restores the database, and verifies table integrity before self-destructing.

---

## API Reference

Interactive documentation and live request testing are hosted at **`/api-docs`** (powered by `swagger-ui-express` and OpenAPI 3.0.3).

| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api-docs` | Public | Interactive Swagger UI API documentation & live playground |
| `GET` | `/api-docs.json` | Public | Raw OpenAPI 3.0.3 specification JSON |
| `GET` | `/` | Public | Lightweight liveness check |
| `GET` | `/healthz` | Public | Deep readiness probe (verifies live PostgreSQL connectivity) |
| `POST` | `/api/v1/users` | Public (Rate-Limited) | Register user with versioned AES-256-GCM PII & Argon2 password hash; returns sanitized masked DTO |
| `POST` | `/api/v1/auth/login` | Public (Rate-Limited) | Authenticate via blind-indexed phone + password; issues 24h JWT |
| `GET` | `/api/v1/users/me` | Bearer JWT | Retrieve current user profile (masked for `MEMBER`, plaintext for `ADMIN`) |
| `GET` | `/api/v1/users/search?phone=...` | Bearer JWT | Exact-match search via HMAC blind index + RBAC output masking |
| `GET` | `/api/v1/audit-logs` | Bearer JWT (`ADMIN`) | Compliance audit trail (`403 Forbidden` for `MEMBER`) |

---

## Local Development, Key Rotation & Backup Drills

### 1. Environment Configuration (`.env`)

Generate cryptographically strong 64-character hex keys (`openssl rand -hex 32`) and configure `.env`:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/pii_secure_db

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

### 3. Zero-Downtime Key-Ring Rotation Runbook

When rotating encryption keys or blind-index salts in production:

```bash
# 1. Append new key version to .env and switch active version (keep old key in ring for legacy reads)
#    PII_ENCRYPTION_KEYS=v1:<old_key>,v2:<new_key>
#    ACTIVE_ENCRYPTION_KEY_VERSION=v2

# 2. Restart API container so new writes immediately use v2
docker compose up -d --no-deps api

# 3. Preview legacy v1 rows eligible for background migration (dry-run)
docker compose exec api npx ts-node scripts/rotate-keys.ts --dry-run

# 4. Execute transactional batch re-encryption from v1 -> v2
docker compose exec api npx ts-node scripts/rotate-keys.ts
```

### 4. Encrypted Backup & Restore Verification

```bash
chmod +x scripts/backup-db.sh scripts/verify-restore.sh

# Create an AES-256-CBC encrypted database backup in ./backups
./scripts/backup-db.sh

# Spin up an ephemeral sandbox DB to verify decryption & restore integrity
./scripts/verify-restore.sh
```