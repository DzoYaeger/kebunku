# UPLOAD.md — Panduan Deploy Manual Kebunku

Panduan lengkap upload aplikasi **Kebunku** ke hosting secara **manual** (tanpa script otomatis).

- **Domain:** kebunku.bpompalopo.com
- **SSH:** `ssh -p 65002 u192774805@153.92.8.37`
- **Database:** `u192774805_kebunku` · user `u192774805_kebunku`
- **Prinsip keamanan:** folder Laravel **di luar** `public_html`.

---

## Struktur Akhir di Server

```
~/domains/kebunku.bpompalopo.com/
├── kebunku_backend/        ← aplikasi Laravel (TIDAK bisa diakses publik)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── routes/
│   ├── resources/
│   ├── storage/
│   ├── vendor/             ← dibuat di server (composer install)
│   ├── artisan
│   ├── composer.json
│   ├── composer.lock
│   └── .env                ← dibuat manual di server
│
└── public_html/            ← document root (yang diakses publik)
    ├── index.php           ← dari deploy/public_html/index.php
    ├── .htaccess           ← dari deploy/public_html/.htaccess
    ├── index.html          ← dari frontend/dist/
    ├── assets/             ← dari frontend/dist/assets/
    ├── favicon.svg
    ├── icons.svg
    ├── manifest.webmanifest
    ├── pwa-192x192.png
    ├── pwa-512x512.png
    ├── registerSW.js
    ├── sw.js
    └── workbox-xxxxxxxx.js
```

---

## BAGIAN A — Upload Backend Laravel

### A1. File/folder yang DIUPLOAD ke `~/domains/kebunku.bpompalopo.com/kebunku_backend/`

Dari folder **`backend/`** di komputer Anda, upload SEMUA ini:

```
app/
bootstrap/
config/
database/
public/            ← TIDAK PERLU (lihat catatan), boleh di-skip
resources/
routes/
storage/
artisan
composer.json
composer.lock
```

### A2. File/folder yang JANGAN diupload

```
vendor/            ← akan dibuat di server via composer install
node_modules/
.env               ← dibuat manual di server (Bagian A4)
.env.production    ← berisi rahasia, jangan diupload
.git/
tests/             ← opsional, tidak wajib di production
```

> Catatan folder `public/`: tidak dipakai karena kita pakai `index.php` khusus
> (Bagian B). Boleh diupload, tidak masalah, tapi tidak digunakan.

### A3. Install dependency (via SSH)

```bash
cd ~/domains/kebunku.bpompalopo.com/kebunku_backend
composer install --no-dev --optimize-autoloader
```

### A4. Buat file `.env` (via SSH) — paste SELURUH blok sekaligus

```bash
cat > ~/domains/kebunku.bpompalopo.com/kebunku_backend/.env <<'EOF'
APP_NAME=Kebunku
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://kebunku.bpompalopo.com
APP_LOCALE=id
APP_FALLBACK_LOCALE=en
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=u192774805_kebunku
DB_USERNAME=u192774805_kebunku
DB_PASSWORD=@@Se7encyber
SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
LOG_CHANNEL=stack
LOG_LEVEL=error
MAIL_MAILER=log
EOF
```

Verifikasi isi `.env` bersih (tanpa karakter `>` di depan):
```bash
head -5 ~/domains/kebunku.bpompalopo.com/kebunku_backend/.env
```

### A5. Generate key, migrasi, optimasi (via SSH)

```bash
cd ~/domains/kebunku.bpompalopo.com/kebunku_backend
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
chmod -R 775 storage bootstrap/cache
```

### A6. Buat akun login (seeder)

```bash
php artisan db:seed --force
```
Akun login: **username** `yaeger` · **password** `se7encyber`

---

## BAGIAN B — Upload Frontend ke `public_html`

### B1. File yang DIUPLOAD ke `~/domains/kebunku.bpompalopo.com/public_html/`

Dari folder **`frontend/dist/`** di komputer Anda, upload SEMUA isinya:

```
index.html
assets/                 (seluruh isi folder)
favicon.svg
icons.svg
manifest.webmanifest
pwa-192x192.png
pwa-512x512.png
registerSW.js
sw.js
workbox-xxxxxxxx.js
```

### B2. Upload 2 file konfigurasi ke `public_html/`

Dari folder **`deploy/public_html/`** di komputer Anda:

```
deploy/public_html/index.php    →  public_html/index.php
deploy/public_html/.htaccess    →  public_html/.htaccess
```

> File `.htaccess` diawali titik — pastikan File Manager menampilkan hidden files.

### B3. Cek path backend di `index.php`

Buka `public_html/index.php`, pastikan baris ini benar:
```php
$backend = __DIR__ . '/../kebunku_backend';
```
Path ini mengasumsikan `kebunku_backend` sejajar dengan `public_html`
(keduanya di dalam `~/domains/kebunku.bpompalopo.com/`). **Sudah sesuai.**

---

## BAGIAN C — Verifikasi

1. Buka **https://kebunku.bpompalopo.com**
   → Harus muncul **halaman login Kebunku** (bukan halaman Laravel).

2. Buka **https://kebunku.bpompalopo.com/api/lahan**
   → Harus balas `{"message":"Unauthenticated."}` (status 401).
   → Artinya API jalan & aman.

3. Coba **registrasi / login** lalu tambah data.

> Jika masih muncul halaman Laravel di root: pastikan `.htaccess` sudah berisi
> `DirectoryIndex index.html index.php` dan `index.html` ada di `public_html`.
> Lakukan hard refresh (`Ctrl+Shift+R`) atau buka mode incognito.

---

## BAGIAN D — Update Aplikasi (rilis berikutnya)

**Jika ubah Frontend:**
1. Di lokal: `cd frontend && npm run build`
2. Upload ulang isi `frontend/dist/` ke `public_html/` (timpa file lama).
   Hapus dulu `public_html/assets/` lama agar tidak ada file usang.

**Jika ubah Backend:**
1. Upload file backend yang berubah ke `kebunku_backend/`.
2. Via SSH:
   ```bash
   cd ~/domains/kebunku.bpompalopo.com/kebunku_backend
   composer install --no-dev --optimize-autoloader   # jika ada dependency baru
   php artisan migrate --force                         # jika ada migrasi baru
   php artisan config:cache && php artisan route:cache
   ```

---

## Troubleshooting

| Masalah | Penyebab & Solusi |
|---------|-------------------|
| Root tampil halaman Laravel | `.htaccess` belum ada `DirectoryIndex index.html`, atau `index.html` belum diupload. |
| 500 Internal Server Error | Cek `kebunku_backend/storage/logs/laravel.log`. Pastikan `APP_KEY` ter-generate & `storage` writable (chmod 775). |
| API balas HTML bukan JSON | Path `$backend` di `index.php` salah. |
| Selalu 401 walau login | Header `Authorization` tidak diteruskan — pastikan blok `HTTP:Authorization` ada di `.htaccess`. |
| "Failed to parse dotenv" | File `.env` berisi karakter nyasar (`>`). Buat ulang (Bagian A4), paste sekaligus. |
| DB connection refused | Cek `DB_HOST` (kadang `localhost`), nama DB, user, password. |
| Refresh halaman SPA → 404 | `.htaccess` belum aktif / `mod_rewrite` mati. |

---

## Catatan Keamanan
- Setelah deploy, **ganti password SSH** (sempat dibagikan saat setup).
- Gunakan password **DB berbeda** dari password SSH.
- `APP_DEBUG=false` di production (sudah diset) agar error tidak bocor ke publik.
