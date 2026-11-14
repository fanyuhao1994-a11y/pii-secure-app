#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${BACKUP_ENCRYPTION_PASSWORD:?❌ 请先在 .env 中设置 BACKUP_ENCRYPTION_PASSWORD}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_NAME="${DB_NAME:-pii_secure_db}"

# 自动找到最新生成的那份加密备份文件
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}/${DB_NAME}_"*.sql.gz.enc 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ 未在 ${BACKUP_DIR} 找到任何加密备份文件，请先运行 backup-db.sh"
  exit 1
fi

echo "🔍 找到最新加密备份: $LATEST_BACKUP"

SANDBOX_CONTAINER="pii_restore_drill_sandbox"
# 无论脚本成功还是中途报错，退出时都会自动清理掉临时演练容器
trap 'docker rm -f "$SANDBOX_CONTAINER" >/dev/null 2>&1 || true' EXIT

echo "🧪 启动隔离沙箱 PostgreSQL 容器..."
docker run -d --name "$SANDBOX_CONTAINER" -e POSTGRES_PASSWORD=drill_temp_pass -e POSTGRES_DB="$DB_NAME" postgres:16-alpine >/dev/null

# 等待沙箱数据库就绪
until docker exec "$SANDBOX_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

echo "🔓 正在解密备份并还原至沙箱数据库..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_PASSWORD -in "$LATEST_BACKUP" \
  | gunzip \
  | docker exec -i "$SANDBOX_CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 >/dev/null

# 校验核心业务表是否已成功恢复
TABLE_COUNT=$(docker exec "$SANDBOX_CONTAINER" psql -U postgres -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "✅ 恢复演练成功！沙箱库已成功还原 ${TABLE_COUNT} 张数据表，备份文件完整可用。"
else
  echo "❌ 恢复演练失败：还原后未检测到任何业务表！"
  exit 1
fi