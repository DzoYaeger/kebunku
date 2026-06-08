# Panduan Deploy Kebunku ke Hosting (SSH)

Domain: **kebunku.bpompalopo.com** · Backend **di luar** `public_html` (aman).

## Prinsip Keamanan
- Folder Laravel (`app/`, `.env`, `database/`, dll) **tidak** berada di `public_html` sehingga tidak bisa diakses publik via URL.
- Hanya folder `public/` Laravel (digabung dengan frontend) yang menjadi document root.
- `vendor/` **tidak diupload** — di-generate di server via `composer install` (lebih aman & ringan).

---

## Struktur Akhir di Server

```
/home/u192774805/
├── kebunku_backend/                         ← Laravel app (DI LUAR web root)
│   ├── app/  bootstrap/  config/  database/
│   ├── routes/  storage/  vendor/ (hasil composer)
│   ├── artisan  composer.json  .env
│   └── (TANPA folder public/)
│
└── domains/kebunku.bpompalopo.com/
    └── public_html/                         ← document root
        ├── index.php                        ← dari deploy/public_html/index.php
        ├── .htaccess                        ← dari deploy/public_html/.htaccess
        ├── index.html                       ← dari frontend/dist/
        ├── assets/                          ← dari frontend/dist/
        ├── sw.js  manifest.webmanifest  ...
```

---

## A. Siapkan Backend (lokal)

Upload **seluruh isi `/backend` KECUALI**:
- `vendor/` (di-generate di server)
- `node_modules/`
- `.env` (dibuat di server)
- `storage/*.key`, file log
- folder `public/` (tidak perlu — kita pakai index.php khusus)

> Tip: kompres dulu agar cepat. Dari folder `backend/`:
> ```bash
> # Windows PowerShell — buat zip tanpa vendor & public
> # (atau gunakan FileZilla/SFTP, drag folder selain vendor/public)
> ```

Upload ke `~/kebunku_backend/` di server (via SFTP / File Manager / git clone).

---

## B. Setup Backend via SSH

```bash
cd ~/kebunku_backend

# 1. Install dependency (tanpa dev, optimized)
composer install --no-dev --optimize-autoloader

# 2. Buat file .env (copy dari .env.production yang sudah disiapkan)
#    Lalu isi sesuai kredensial hosting:
nano .env
```

Isi `.env` (sudah disiapkan di `backend/.env.production`):
```env
APP_NAME=Kebunku
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://kebunku.bpompalopo.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=u192774805_kebunku
DB_USERNAME=u192774805_kebunku
DB_PASSWORD="@@Se7encyber"
```

```bash
# 3. Generate APP_KEY
php artisan key:generate

# 4. Jalankan migrasi (buat tabel)
php artisan migrate --force

# 5. (Opsional) Seed data demo
php artisan db:seed --force

# 6. Optimasi cache config/route untuk production
php artisan config:cache
php artisan route:cache

# 7. Pastikan storage & bootstrap/cache writable
chmod -R 775 storage bootstrap/cache
```

---

## C. Siapkan public_html

1. Upload **semua isi `frontend/dist/`** ke `public_html/`.
2. Upload **`deploy/public_html/index.php`** ke `public_html/index.php`.
3. Upload **`deploy/public_html/.htaccess`** ke `public_html/.htaccess`.

### Sesuaikan path backend di `index.php`
Buka `public_html/index.php`, cek baris:
```php
$backend = __DIR__ . '/../../../kebunku_backend';
```
Path ini mengasumsikan struktur Hostinger standar. **Verifikasi** dengan SSH:
```bash
# Cek path absolut public_html
cd ~/domains/kebunku.bpompalopo.com/public_html && pwd
# Cek path absolut backend
cd ~/kebunku_backend && pwd
```
Jika berbeda, ganti jadi path absolut, contoh:
```php
$backend = '/home/u192774805/kebunku_backend';
```

---

## D. Verifikasi

1. Buka `https://kebunku.bpompalopo.com` → halaman login Kebunku tampil.
2. Test API: `https://kebunku.bpompalopo.com/api/lahan` (tanpa token harus balas **401** — artinya Laravel jalan & route aman).
3. Login dengan akun seeder: `pekebun@kebunku.test` / `password` (jika di-seed).

---

## E. Update Aplikasi (rilis berikutnya)

**Frontend:**
```bash
# lokal
cd frontend && npm run build
# upload ulang isi dist/ ke public_html/ (timpa)
```

**Backend:**
```bash
# upload perubahan source, lalu di SSH:
cd ~/kebunku_backend
composer install --no-dev --optimize-autoloader   # jika ada dep baru
php artisan migrate --force                         # jika ada migrasi baru
php artisan config:cache && php artisan route:cache
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| 500 Error | Cek `~/kebunku_backend/storage/logs/laravel.log`. Pastikan `APP_KEY` sudah di-generate & `storage` writable. |
| 404 di route SPA (refresh halaman) | Pastikan `.htaccess` ter-upload & `mod_rewrite` aktif. |
| API balas HTML, bukan JSON | Path `$backend` di `index.php` salah — perbaiki. |
| Token tidak terbaca / selalu 401 | Pastikan blok `HTTP:Authorization` di `.htaccess` ada. |
| DB connection refused | Cek `DB_HOST` (kadang `localhost` bukan `127.0.0.1`) & kredensial. |
| Config lama terbaca | Jalankan `php artisan config:clear` lalu `config:cache`. |
