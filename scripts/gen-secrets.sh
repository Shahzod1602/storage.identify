#!/usr/bin/env bash
# Production uchun kuchli tasodifiy secretlarni generatsiya qiladi.
# Ishlatish: ./scripts/gen-secrets.sh
set -euo pipefail

echo "# storagedb production secretlari — .env ga nusxalang"
echo "NODE_ENV=production"
echo "PLATFORM_SECRET=$(openssl rand -hex 32)"
echo "PLATFORM_ADMIN_TOKEN=$(openssl rand -hex 24)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
echo ""
echo "# Eslatma: PLATFORM_SECRET o'zgartirilsa, mavjud jwt_secret'lar"
echo "# (shifrlangan) deshifrlanmaydi — uni BIR MARTA o'rnating va saqlang!"
