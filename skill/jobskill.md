# AI IDE Skills & Execution Playbook: Agrogrow PWA (Laravel 12+ Edition)
This document defines the strict execution capabilities, workflow rules, and terminal commands required by the AI IDE to build, refactor, and maintain the Agrogrow application.

---

## 🚀 1. Stack Environment & Directory Rules
The project is split into an API-first backend and a PWA frontend. The AI must always execute commands in the correct context:

* **Backend Path:** `/backend` (Laravel 12+, PHP 8.3+, MariaDB)
* **Frontend Path:** `/frontend` (React 18+, Ionic 7+, Vite, Tailwind CSS)

---

## 🛠 2. Command Execution Registry
When instructed to run, test, or build components, the AI must use the following standard commands. **Never execute raw experimental commands.**

### A. Backend Commands (Run inside `/backend`)
* **Run Development Server:** `php artisan serve`
* **Database Migration:** `php artisan migrate`
* **Database Rollback & Fresh Seed:** `php artisan migrate:fresh --seed`
* **Generate API Resource:** `php artisan make:resource [Name]Resource`
* **Generate Form Request:** `php artisan make:request [Name]Request`
* **Run Feature Tests:** `php artisan test`

### B. Frontend Commands (Run inside `/frontend`)
* **Run Dev Server (Mobile Web):** `npm run dev`
* **Build PWA for Production:** `npm run build` (Generates optimized assets and service workers via `vite-plugin-pwa`)
* **Preview Production Build:** `npm run preview`
* **Install Mobile Dependency:** `npm install [package-name]`

---

## 🧠 3. Core Development Skills & Code Standards

### 🛡 Backend Skills (Laravel 12+ API)
1.  **Streamlined Configuration & Routing:** Laravel 12+ menggunakan struktur proyek modern yang ramping tanpa file config terpisah yang padat (terintegrasi di `bootstrap/app.php`). AI harus mendaftarkan middleware, exception, dan schedule langsung di file tersebut.
2.  **Strict Stateless Authentication:** Semua API route yang diamankan wajib menggunakan *middleware* `auth:sanctum`.
3.  **No Direct DB Output:** Selalu bungkus Eloquent model ke dalam **API Resources** sebelum mengembalikan payload JSON. Pastikan semua key menggunakan format `snake_case` untuk konsistensi data.
4.  **Data Integrity & Type Safety:** Manfaatkan fitur *PHP 8.3+ Type Hinting* secara ketat pada argumen method dan return types di Controller maupun Repository. Validasi wajib dihandle secara terpisah oleh kelas **Form Request**.
5.  **Query Optimization:** Setiap list endpoint yang menarik relasi data wajib menggunakan **Eager Loading** (`with()`) untuk mencegah masalah performa $N+1$ query pada MariaDB.

### 📱 Frontend Skills (React Ionic PWA)
1.  **Strict TypeScript:** Set `noImplicitAny: true` pada `tsconfig.json`. Setiap data payload dari API Laravel 12 wajib memiliki *interface* padanannya di React.
2.  **Ionic Lifecycle Mastery:** Gunakan `useIonViewWillEnter` atau `useIonViewDidEnter` untuk fetching data aktif, alih-alih `useEffect` bawaan React, guna memaksimalkan fitur *page caching* Ionic.
3.  **Offline-First Guardrails:**
    * Sebelum melakukan mutasi data (catat pupuk, semai, kas keluar), aplikasi wajib memeriksa status jaringan (`navigator.onLine`).
    * Jika offline, panggil service `Dexie.js` untuk mengantrekan transaksi ke IndexedDB dan tampilkan Ionic Toast: *"Disimpan secara lokal (Mode Offline)"*.
4.  **State Cleanliness:** Gunakan React Context atau Zustand untuk mengelola state global seperti token autentikasi Sanctum dan antrean sinkronisasi (Sync Queue).

---

## 🎯 4. AI Prompting Automation Triggers
You can trigger specialized AI execution modes by starting your prompt with these keywords:

* **`@gen-api [NamaFitur]`** -> AI akan otomatis membuat Migration, Model, Form Request, Controller, dan API Resource berbasis struktur Laravel 12+.
* **`@gen-page [NamaHalaman]`** -> AI akan membuat halaman Ionic React baru dengan memanfaatkan spesifikasi dari `desain.md`.
* **`@optimize-pwa`** -> AI akan memeriksa bottleneck rendering di frontend untuk memastikan aplikasi berjalan mulus di HP low-end.
* **`@check-sync`** -> AI akan memvalidasi keselarasan skema IndexedDB di React dengan skema tabel MariaDB di Laravel 12.