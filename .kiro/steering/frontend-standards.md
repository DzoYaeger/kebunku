---
inclusion: always
---

# Frontend Standards (React + Ionic PWA)

Aturan wajib untuk semua kode frontend. Tujuan: PWA offline-first, ringan, dan type-safe.

## 1. TypeScript Ketat
- `noImplicitAny: true` di `tsconfig.json`.
- Setiap payload dari API Laravel **wajib** punya `interface` padanannya di `src/types/` (key `snake_case` sesuai API Resource).
- Hindari `any`; gunakan `unknown` lalu narrowing.

## 2. Ionic Lifecycle
- Gunakan **`useIonViewWillEnter` / `useIonViewDidEnter`** untuk fetching data aktif, bukan `useEffect` polos — agar page caching Ionic optimal.
- Bangun UI dengan `@ionic/react` + ikon dari `ionicons/icons`.

## 3. Offline-First Guardrails (kritis)
- Sebelum mutasi data (catat semai, pindah tanam, pupuk, kas keluar), **cek `navigator.onLine`**.
- Jika **offline**: panggil service **Dexie.js** untuk mengantrekan transaksi ke IndexedDB (sync queue) dan tampilkan Ionic Toast: *"Disimpan secara lokal (Mode Offline)"*.
- Jika **online**: kirim ke API; jika gagal jaringan, fallback ke antrean offline.
- Setiap item antrean menyertakan **`client_uuid`** agar replay ke server idempoten (tidak duplikat).
- Saat koneksi kembali, putar ulang sync queue secara berurutan; tandai item terkirim.

## 4. State Management
- Gunakan **Zustand** (atau React Context) untuk state global: token autentikasi Sanctum dan **Sync Queue**.
- Jangan menyimpan token di tempat tidak aman; ikuti pola penyimpanan yang konsisten di seluruh app.

## 5. Performa & Mobile-First
- Target **60 FPS di HP kelas menengah**: jaga component tree tetap datar, hindari micro-animation berat.
- Gunakan **conditional / virtualized rendering** untuk list panjang.
- Responsif penuh pada viewport **360px–430px**; jangan hardcode lebar yang merusak layout mobile.

## 6. Tailwind + Ionic Co-existence
- **Tailwind** untuk micro-layout (margin, padding, flex alignment).
- **Ionic** untuk wrapper/elemen native inti (IonPage, IonHeader, IonContent, IonItem, dll).
- Ikuti token desain di `.kiro/steering/design-system.md`.

## 7. Build PWA
- Service worker & aset dibangun via `vite-plugin-pwa` (`npm run build`).
- Pastikan build lolos sebelum menyatakan tugas selesai.
