#!/usr/bin/env bash
# storagedb backup: platform + barcha proj_* DB + rollar + storage fayllari.
# Ulanish standart libpq env'lari orqali (PGHOST/PGPORT/PGUSER/PGPASSWORD).
#
# Ishlatish:
#   ./scripts/backup.sh
#   BACKUP_DIR=/mnt/backups OFFSITE=user@host:/backups ./scripts/backup.sh
set -euo pipefail

PG_BIN="${PG_BIN:-}"                 # masalan /opt/homebrew/opt/postgresql@17/bin/
PSQL="${PG_BIN}psql"
PGDUMP="${PG_BIN}pg_dump"
PGDUMPALL="${PG_BIN}pg_dumpall"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR:-./backups}/$TS"
STORAGE="${STORAGE_DIR:-./storage-data}"
mkdir -p "$OUT"

echo "▶ Backup: $OUT"

# 1. Klaster rollari (anon/authenticated/service_role/authenticator) — fresh serverga restore uchun
"$PGDUMPALL" --roles-only 2>/dev/null | gzip > "$OUT/roles.sql.gz" || \
  echo "  (rollar dump'i o'tkazib yuborildi)"

# 2. platform + proj_* database'lari
DBS="$("$PSQL" -d "${PLATFORM_DB:-platform}" -tAc \
  "select datname from pg_database where datname='platform' or datname like 'proj_%'")"
for db in $DBS; do
  echo "  dump: $db"
  "$PGDUMP" -d "$db" | gzip > "$OUT/$db.sql.gz"
done

# 3. Storage fayllari
if [ -d "$STORAGE" ]; then
  echo "  dump: storage ($STORAGE)"
  tar czf "$OUT/storage-data.tar.gz" -C "$(dirname "$STORAGE")" "$(basename "$STORAGE")"
fi

echo "✓ Backup tayyor: $OUT"

# 4. Ixtiyoriy offsite (rsync)
if [ -n "${OFFSITE:-}" ]; then
  echo "▶ Offsite: $OFFSITE"
  rsync -a "$OUT" "$OFFSITE/"
  echo "✓ Offsite tugadi"
fi
