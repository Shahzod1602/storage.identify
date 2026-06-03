#!/usr/bin/env bash
# storagedb restore: backup papkasidan rollar + DB'lar + storage'ni tiklaydi.
#
# Ishlatish:
#   ./scripts/restore.sh ./backups/20260604-120000
set -euo pipefail

SRC="${1:?backup papkasini ko'rsating: ./scripts/restore.sh <papka>}"
PG_BIN="${PG_BIN:-}"
PSQL="${PG_BIN}psql"
CREATEDB="${PG_BIN}createdb"
STORAGE="${STORAGE_DIR:-./storage-data}"

echo "▶ Restore: $SRC"

# 1. Rollar (DB'lardan oldin — egalik/grantlar uchun)
if [ -f "$SRC/roles.sql.gz" ]; then
  echo "  rollar..."
  gunzip -c "$SRC/roles.sql.gz" | "$PSQL" -d postgres 2>/dev/null || true
fi

# 2. Database'lar
for f in "$SRC"/*.sql.gz; do
  base="$(basename "$f")"
  [ "$base" = "roles.sql.gz" ] && continue
  db="${base%.sql.gz}"
  echo "  restore: $db"
  "$CREATEDB" "$db" 2>/dev/null || true
  gunzip -c "$f" | "$PSQL" -d "$db" >/dev/null
done

# 3. Storage fayllari
if [ -f "$SRC/storage-data.tar.gz" ]; then
  echo "  storage..."
  mkdir -p "$(dirname "$STORAGE")"
  tar xzf "$SRC/storage-data.tar.gz" -C "$(dirname "$STORAGE")"
fi

echo "✓ Restore tugadi"
