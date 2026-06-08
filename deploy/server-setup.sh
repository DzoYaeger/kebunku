#!/bin/bash
# ============================================================
# Kebunku — Server Setup Script (jalankan di SSH hosting)
# Struktur: backend & public_html di dalam domains/kebunku.bpompalopo.com/
# ============================================================
set -e

DOMAIN_DIR="$HOME/domains/kebunku.bpompalopo.com"
BACKEND="$DOMAIN_DIR/kebunku_backend"
PUBLIC="$DOMAIN_DIR/public_html"
SRC="$HOME/kebunku_src"
REPO="https://github.com/DzoYaeger/kebunku.git"

echo "==> 1/6 Clone / update source dari GitHub"
if [ -d "$SRC/.git" ]; then
  cd "$SRC" && git pull --ff-only
else
  git clone "$REPO" "$SRC"
fi

echo "==> 2/6 Sinkronkan backend (tanpa public/, .env, vendor/)"
mkdir -p "$BACKEND"
rsync -a --exclude 'public' --exclude '.env' --exclude 'vendor' --exclude '.env.production' \
  "$SRC/backend/" "$BACKEND/"

echo "==> 3/6 composer install (production)"
cd "$BACKEND"
composer install --no-dev --optimize-autoloader

echo "==> 4/6 Cek .env"
if [ ! -f "$BACKEND/.env" ]; then
  echo "!! .env belum ada. Buat dulu (lihat instruksi), lalu jalankan ulang script ini."
  exit 1
fi

echo "==> 5/6 Migrasi & optimasi"
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
chmod -R 775 storage bootstrap/cache

echo "==> 6/6 Build & deploy frontend ke public_html"
cd "$SRC/frontend"
if command -v npm >/dev/null 2>&1; then
  npm ci
  npm run build
  mkdir -p "$PUBLIC"
  # Bersihkan aset lama (hati-hati: hanya isi yang di-generate)
  rm -rf "$PUBLIC/assets"
  cp -r dist/* "$PUBLIC/"
  cp "$SRC/deploy/public_html/index.php" "$PUBLIC/index.php"
  cp "$SRC/deploy/public_html/.htaccess" "$PUBLIC/.htaccess"
  echo "==> Frontend ter-deploy."
else
  echo "!! npm tidak tersedia di server."
  echo "   Build 'frontend' di lokal (npm run build), lalu upload isi dist/ + "
  echo "   deploy/public_html/index.php & .htaccess ke: $PUBLIC"
fi

echo ""
echo "✅ SELESAI. Cek: https://kebunku.bpompalopo.com"
echo "   Test API (harus 401 tanpa token): https://kebunku.bpompalopo.com/api/lahan"
