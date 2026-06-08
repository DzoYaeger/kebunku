# 🌱 Kebunku (Agrogrow)

PWA manajemen kebun & arus kas untuk petani/pekebun skala kecil–menengah. Dipakai langsung di lapangan dari ponsel, **offline-first**, dengan asisten AI untuk perawatan tanaman.

🔗 **Live:** [kebunku.bpompalopo.com](https://kebunku.bpompalopo.com)

---

## ✨ Fitur Utama

- **Lahan** — kelola bedengan/lahan: nomor bed, komoditas, status tanam, tanggal tanam.
- **Aktivitas** — catat siklus tanam: Semai, Pindah Tanam, Pemupukan, Pestisida.
- **Keuangan** — arus kas: Kas Keluar & Kas Masuk, ringkasan saldo, ringkasan per komoditas.
- **Perawatan** — riwayat pemupukan & pestisida per tanaman, grouping per komoditas, badge urgensi, saran AI per tanaman.
- **Cuaca & Saran Harian** — prakiraan cuaca (Open-Meteo) + saran harian berbasis AI di halaman Tanaman.
- **Konsultasi AI (Chat)** — chat dengan asisten pertanian AI, riwayat sesi, pilih tanaman sebagai konteks, kirim/foto gambar untuk dianalisis.
- **Pengaturan** — edit profil (nama, username, email), ubah password, atur lokasi cuaca (GPS atau manual).
- **Offline-first** — semua mutasi tetap berfungsi tanpa jaringan, lalu tersinkron otomatis tanpa duplikasi (idempoten via `client_uuid`).

---

## 🧱 Tech Stack

| Bagian | Teknologi |
|--------|-----------|
| **Backend** (`/backend`) | Laravel 12, PHP 8.3+, MariaDB/MySQL, Laravel Sanctum (auth API stateless) |
| **Frontend** (`/frontend`) | React 18, Ionic 7, Vite, TypeScript (strict), Tailwind CSS, Dexie.js (IndexedDB), Zustand, vite-plugin-pwa |
| **AI** | Groq API (`llama-3.3-70b-versatile` untuk teks, `llama-4-scout` untuk vision/gambar) |
| **Cuaca** | Open-Meteo API (gratis, tanpa API key) |

---

## 📁 Struktur Proyek

```
kebunku/
├── backend/          # Laravel 12 API
│   ├── app/Http/Controllers/Api/   # Controller API (tipis)
│   ├── app/Http/Requests/          # Form Request (validasi)
│   ├── app/Http/Resources/         # API Resource (JSON snake_case)
│   ├── app/Models/                 # Eloquent models
│   ├── database/migrations/
│   └── routes/api.php
│
└── frontend/         # React + Ionic PWA
    ├── src/pages/                  # halaman per domain
    │   ├── Lahan/ Aktivitas/ Keuangan/
    │   ├── Perawatan/ Chat/ Settings/
    ├── src/api/                    # client HTTP
    ├── src/db/                     # Dexie.js + sync queue
    ├── src/store/                  # Zustand (auth, sync, location)
    └── src/App.tsx                 # IonTabs shell
```

---

## 🚀 Setup Development

### Backend (`/backend`)
```bash
composer install
cp .env.example .env        # lalu isi DB & GROQ_API_KEY
php artisan key:generate
php artisan migrate --seed
php artisan storage:link    # untuk upload gambar chat
php artisan serve
```

Variabel `.env` penting:
```
DB_CONNECTION=mysql
DB_DATABASE=kebunku
GROQ_API_KEY=gsk_xxx        # dari https://console.groq.com
APP_URL=https://domain-anda.com
```

### Frontend (`/frontend`)
```bash
npm install
npm run dev                 # dev server
npm run build               # build PWA produksi (output: dist/)
```

---

## 🔌 Ringkasan API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` · `/api/auth/login` | Auth (login via email **atau** username) |
| PUT | `/api/auth/profile` · `/api/auth/password` | Update profil & password |
| GET/POST/PUT/DELETE | `/api/lahan` | CRUD lahan |
| GET/POST/DELETE | `/api/aktivitas` | Aktivitas tanam |
| GET/POST/DELETE | `/api/transaksi` | Keuangan + ringkasan saldo |
| GET | `/api/perawatan` · POST `/api/perawatan/saran-ai` | Perawatan + saran AI |
| GET | `/api/cuaca` · `/api/saran-harian` | Cuaca & saran harian AI |
| GET/POST/DELETE | `/api/chat/sessions` (+`/messages`) | Konsultasi AI |

Semua endkpoin (kecuali register/login) diproteksi `auth:sanctum`. Output JSON `snake_case` via API Resource.

---

## 🔐 Prinsip Desain

- **Offline-first**: mutasi disimpan ke IndexedDB saat offline, replay idempoten via `client_uuid` saat online.
- **Mobile-first**: viewport target 360–430px, target 60 FPS di HP kelas menengah.
- **Stateless API**: token Sanctum via header `Authorization: Bearer`.
- **Type-safe**: TypeScript strict di frontend, PHP 8.3 type hints di backend.

---

## 📦 Deployment

Frontend (hasil `npm run build`, folder `dist/`) di-upload ke document root web. Backend Laravel ditempatkan di luar document root, dengan `public/index.php` yang mem-bootstrap aplikasi. Setelah deploy backend baru, jalankan:
```bash
php artisan migrate --force
php artisan config:clear && php artisan route:clear
php artisan storage:link
```
