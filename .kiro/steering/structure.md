---
inclusion: always
---

# Project Structure

Monorepo dua bagian: `/backend` (Laravel 12 API) dan `/frontend` (React + Ionic PWA).

```
kebunku/
├── backend/                 # Laravel 12 API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/   # Controller API (tipis, delegasi ke service/repo)
│   │   │   ├── Requests/          # Form Request (semua validasi di sini)
│   │   │   └── Resources/         # API Resource (output JSON snake_case)
│   │   └── Models/                # Eloquent models
│   ├── bootstrap/app.php          # registrasi middleware, exception, schedule (Laravel 12)
│   ├── database/
│   │   ├── migrations/
│   │   ├── factories/
│   │   └── seeders/
│   ├── routes/api.php             # semua route API (prefix /api)
│   └── tests/Feature/             # feature test
│
└── frontend/                # React 18 + Ionic 7 PWA
    ├── src/
    │   ├── pages/                 # halaman per domain: Lahan/, Aktivitas/, Keuangan/
    │   ├── components/            # komponen UI reusable
    │   ├── api/                   # client HTTP + endpoint terkait Laravel API
    │   ├── db/                    # skema Dexie.js (IndexedDB) + sync queue
    │   ├── store/                 # Zustand store (auth token, sync queue, state global)
    │   ├── hooks/                 # custom hooks (useOnline, useSync, dll)
    │   ├── types/                 # TypeScript interface padanan payload API
    │   ├── theme/                 # variabel warna/tema Ionic + Tailwind config
    │   └── App.tsx                # IonTabs root shell (Lahan/Aktivitas/Keuangan)
    ├── public/
    ├── tailwind.config.js
    ├── tsconfig.json              # noImplicitAny: true (strict)
    └── vite.config.ts             # vite-plugin-pwa
```

## Aturan Penempatan
- Logika validasi → `Requests/`, bukan di controller.
- Bentuk output JSON → `Resources/`, jangan kembalikan model Eloquent langsung.
- Tiap interface payload API di frontend → `src/types/`, satu padanan per Resource backend.
- Skema IndexedDB harus selaras dengan skema tabel MariaDB (lihat trigger `@check-sync`).
- Halaman dikelompokkan per domain (Lahan, Aktivitas, Keuangan) agar konsisten dengan navigasi.
