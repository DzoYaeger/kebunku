---
inclusion: always
---

# Tech Stack & Commands

Proyek terbagi menjadi backend API-first dan frontend PWA. **Selalu jalankan perintah di direktori yang benar.**

## Stack
- **Backend** (`/backend`): Laravel 12+, PHP 8.3+, MariaDB, Laravel Sanctum (auth API stateless).
- **Frontend** (`/frontend`): React 18+, Ionic 7+, Vite, Tailwind CSS, TypeScript (strict), Dexie.js (IndexedDB), Zustand/React Context (state global).

## Command Registry (gunakan persis ini — jangan jalankan perintah eksperimental)

### Backend (jalankan di dalam `/backend`)
- Dev server: `php artisan serve`
- Migrasi DB: `php artisan migrate`
- Rollback & fresh seed: `php artisan migrate:fresh --seed`
- Generate API Resource: `php artisan make:resource [Name]Resource`
- Generate Form Request: `php artisan make:request [Name]Request`
- Jalankan feature test: `php artisan test`

### Frontend (jalankan di dalam `/frontend`)
- Dev server: `npm run dev`
- Build PWA produksi: `npm run build` (menghasilkan aset teroptimasi + service worker via `vite-plugin-pwa`)
- Preview build produksi: `npm run preview`
- Install dependency: `npm install [package-name]`

## Automation Triggers
Mode eksekusi khusus dipicu oleh keyword di awal prompt:
- **`@gen-api [NamaFitur]`** → buat Migration, Model, Form Request, Controller, dan API Resource berbasis struktur Laravel 12+.
- **`@gen-page [NamaHalaman]`** → buat halaman Ionic React baru memakai spesifikasi `skill/desain.md` & `.kiro/steering/design-system.md`.
- **`@optimize-pwa`** → periksa bottleneck rendering frontend agar mulus di HP low-end.
- **`@check-sync`** → validasi keselarasan skema IndexedDB (React) dengan skema tabel MariaDB (Laravel 12).

## Aturan Umum
- Jangan jalankan migrasi destruktif (`migrate:fresh`) tanpa konfirmasi pengguna bila ada data penting.
- Setelah perubahan kode backend jalankan `php artisan test`; setelah perubahan frontend pastikan `npm run build` lolos.
