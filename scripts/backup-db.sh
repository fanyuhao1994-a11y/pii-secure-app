#!/usr/bin/env bash
set -euo pipefail

# 加载本地环境变量（如果存在）
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# 检查是否配置了独立的备份加密密码
: "${BACKUP_ENCRYPTION_PASSWORD:?❌ 请先在 .env 中设置 BACKUP_ENCRYPTION_PASSWORD（备份专用加密密码）}"

CONTAINER_NAME="${DB_CONTAINER_NAME:-pii_postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-pii_secure_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz.enc"

echo "📦 开始导出并压缩数据库 [${DB_NAME}]..."
# 1. 从运行中的 PostgreSQL 容器导出 SQL
# 2. gzip 压缩体积
# 3. 使用 OpenSSL AES-256-CBC + PBKDF2 强加密落盘（全程内存管道流转，绝不生成明文临时文件）
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_PASSWORD -out "$BACKUP_FILE"

echo "✅ 加密备份完成！文件已保存至: $BACKUP_FILE"

# 自动清理 7 天前的本地旧备份，防止占满服务器硬盘
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz.enc" -mtime +7 -delete