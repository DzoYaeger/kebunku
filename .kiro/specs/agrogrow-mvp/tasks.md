# Implementation Plan — Agrogrow / Kebunku MVP

Rencana eksekusi bertahap. Tiap task incremental, dapat diuji, dan mereferensikan requirement terkait. Backend dikerjakan lebih dulu per domain agar frontend punya kontrak API yang stabil. Tandai `[x]` saat selesai.

## Fase 0 — Scaffolding Proyek
- [x] 1. Inisialisasi backend Laravel 12 di `/backend`
  - Buat proyek Laravel 12, konfigurasi koneksi MariaDB di `.env`.
  - Install & konfigurasi Laravel Sanctum (API token).
  - Daftarkan middleware/exception di `bootstrap/app.php` (struktur Laravel 12).
  - _Requirements: R1_

- [x] 2. Inisialisasi frontend React+Ionic di `/frontend`
  - Scaffold Vite + React + TypeScript, install `@ionic/react`, `ionicons`, Tailwind, `vite-plugin-pwa`, `dexie`, `zustand`, `axios`, `uuid`.
  - Set `tsconfig.json` `noImplicitAny: true`; setup Tailwind + token warna/typografi dari design-system.
  - Buat `IonTabs` shell (Lahan/Aktivitas/Keuangan) dengan ikon outline/filled emerald.
  - _Requirements: R6_

## Fase 1 — Autentikasi
- [x] 3. Backend: endpoint auth Sanctum
  - Form Request `RegisterRequest`, `LoginRequest`; controller `AuthController` (register/login/logout/me); `UserResource`.
  - Route `/auth/*` di `routes/api.php`; proteksi non-publik dengan `auth:sanctum`.
  - Feature test: register valid/duplikat email, login benar/salah, akses tanpa token → 401, logout mencabut token.
  - _Requirements: R1.1–R1.6_

- [x] 4. Frontend: alur auth + persist sesi
  - `authStore` (Zustand): token, user, login/logout; persist token agar sesi bertahan.
  - Axios interceptor: inject Bearer, tangani 401 → logout.
  - Halaman Login & Register; guard rute untuk halaman terproteksi.
  - _Requirements: R1.3, R1.5, R1.7_

## Fase 2 — Fondasi Offline (Dexie + SyncEngine)
- [x] 5. Setup Dexie schema & repository pattern
  - Definisikan tabel `lahan`, `aktivitas`, `transaksi`, `sync_queue` (lihat design.md).
  - Buat helper `client_uuid` (uuid v4) dan base repository: tulis lokal `_dirty`, baca dari Dexie.
  - Hook `useOnline` berbasis `navigator.onLine` + event online/offline.
  - _Requirements: R5.1, R5.2_

- [x] 6. Implementasi SyncEngine
  - Proses `sync_queue` FIFO; kirim payload + `client_uuid`; sukses → set `server_id`, hapus item.
  - Gagal jaringan → retry siklus berikutnya (naikkan `attempts`); gagal 4xx → status `failed` + notifikasi.
  - `syncStore`: `pendingCount`, `isOnline`, `lastSyncedAt`; indikator status di UI.
  - Pemicu: event `online`, app start, interval ringan.
  - Test: replay sukses, retry gagal jaringan, mark failed pada 422.
  - _Requirements: R5.3–R5.8_

## Fase 3 — Domain Lahan
- [x] 7. Backend: CRUD Lahan idempoten
  - Migration `lahan` (+ `client_uuid`, unique(user_id, client_uuid), unique nomor_bed per user, enum status).
  - Model, `LahanRequest`, `LahanController` (filter `user_id`, `firstOrCreate` by client_uuid), `LahanResource`.
  - Feature test: CRUD, filter kepemilikan (IDOR), idempotensi POST ganda, validasi bed duplikat.
  - _Requirements: R2.1–R2.6, R5.4_

- [x] 8. Frontend: halaman Lahan
  - `LahanListPage` (fetch via `useIonViewWillEnter`, render efisien), `LahanFormModal`, `LahanCard` dengan badge status (amber/green).
  - Mutasi lewat repository (online → API, offline → queue + Toast "Disimpan secara lokal (Mode Offline)").
  - Konfirmasi hapus.
  - _Requirements: R2.1–R2.7, R5.1_

## Fase 4 — Domain Aktivitas
- [x] 9. Backend: Aktivitas idempoten + update status lahan
  - Migration `aktivitas` (FK lahan cascade, enum tipe, `jenis_pupuk` nullable, `client_uuid`).
  - `AktivitasRequest`, `AktivitasController` (pindah_tanam → update status lahan jadi `aktif`; eager load `lahan`; urut terbaru), `AktivitasResource`.
  - Feature test: catat tiap tipe, validasi lahan wajib, update status saat pindah tanam, idempotensi.
  - _Requirements: R3.1–R3.5, R5.4_

- [x] 10. Frontend: halaman Aktivitas
  - `AktivitasListPage` (riwayat terbaru), `AktivitasFormModal` (pilih tipe & lahan, field pupuk kondisional), `AktivitasItem` dengan badge tipe.
  - Dukung mode offline via repository + queue.
  - _Requirements: R3.1–R3.7, R5.1_

## Fase 5 — Domain Keuangan
- [x] 11. Backend: Transaksi (Kas Keluar) + saldo
  - Migration `transaksi` (enum tipe, decimal nominal > 0, FK lahan nullable, `client_uuid`).
  - `TransaksiRequest` (nominal > 0), `TransaksiController` (list + ringkasan saldo agregat, filter user_id, idempoten), `TransaksiResource`.
  - Feature test: catat kas keluar, validasi nominal <= 0 ditolak, agregasi saldo benar, hapus menyesuaikan saldo, idempotensi.
  - _Requirements: R4.1–R4.6, R5.4_

- [x] 12. Frontend: halaman Keuangan
  - `KeuanganPage` (kartu ringkasan saldo + list transaksi terbaru), `TransaksiFormModal`, `TransaksiItem` (badge rose, format Rupiah via `Intl.NumberFormat('id-ID')`).
  - Mode offline via repository + queue; konfirmasi hapus.
  - _Requirements: R4.1–R4.6, R5.1_

## Fase 6 — PWA, Polish & Verifikasi Akhir
- [x] 13. Finalisasi PWA & performa
  - Konfigurasi `vite-plugin-pwa` (manifest, service worker, instalable, dapat dibuka offline).
  - Audit performa: component tree datar, virtualisasi list, hindari animasi berat (target 60 FPS); verifikasi responsif 360–430px.
  - _Requirements: R6.3–R6.5_

- [x] 14. Validasi end-to-end offline-sync (`@check-sync`)
  - Verifikasi keselarasan skema Dexie ↔ MariaDB.
  - Skenario manual: offline → catat lahan/aktivitas/transaksi → online → tersinkron tanpa duplikat (uji ulang `client_uuid`).
  - Jalankan `php artisan test` (backend) dan pastikan `npm run build` lolos (frontend).
  - _Requirements: R5.1–R5.8, semua_

## Catatan Eksekusi
- Gunakan command registry di `.kiro/steering/tech.md`; jangan jalankan perintah eksperimental.
- Trigger otomasi: `@gen-api [Fitur]` untuk task backend, `@gen-page [Halaman]` untuk task frontend.
- Patuhi `backend-standards.md`, `frontend-standards.md`, dan `design-system.md` pada setiap task.

---

## Fase 7 — Perawatan & Cuaca (AI)
- [x] 15. Backend: endpoint Perawatan (riwayat pupuk/pestisida per lahan)
  - `PerawatanController@index` — aggregasi aktivitas tipe pemupukan/pestisida per lahan.
  - `PerawatanResource` — output: terakhir dipupuk/dipestisida, riwayat lengkap.
  - `PerawatanController@saranAi` — kirim data ke Groq AI, kembalikan saran.
  - _Requirements: Modul Perawatan_

- [x] 16. Backend: endpoint Cuaca & Saran Harian
  - `CuacaController@index` — ambil prakiraan cuaca via Open-Meteo (gratis, default Palopo).
  - `CuacaController@saranHarian` — AI analisis cuaca + data tanaman aktif, beri saran harian.
  - _Requirements: AI Integration_

- [x] 17. Frontend: halaman Perawatan
  - UI expandable cards, urgency badges (hijau/kuning/merah), summary bar, riwayat timeline.
  - Tombol "Minta Saran AI" per tanaman.
  - Tab Perawatan di bottom nav (ikon medkit).
  - _Requirements: Modul Perawatan_

- [x] 18. Frontend: widget Cuaca & Saran AI di halaman Tanaman
  - Widget cuaca (suhu, kelembaban, prediksi hujan) di bawah hero stats.
  - Saran AI harian expandable.
  - _Requirements: AI Integration_

## Fase 8 — Settings & Profil
- [x] 19. Backend: update profil (username, nama, email, password)
  - Tambah kolom `username` ke tabel users (unique, nullable).
  - Endpoint `PUT /api/auth/profile` — update name, email, username.
  - Endpoint `PUT /api/auth/password` — update password (validasi old password).
  - _Requirements: Settings_

- [x] 20. Backend: login via username ATAU email
  - Update `LoginRequest` dan `AuthController@login` — terima field `login` yang bisa email atau username.
  - Feature test: login email, login username, username salah → 401.
  - _Requirements: R1 Extension_

- [x] 21. Frontend: halaman Settings
  - Tab/page Settings — menu: Edit Profil, Pengaturan Lokasi.
  - Edit Profil: form ubah username, nama, email, password.
  - _Requirements: Settings_

- [x] 22. Frontend & Backend: Pengaturan Lokasi
  - Saat ditekan, minta izin GPS (`navigator.geolocation`).
  - Atau input manual nama kota → geocode ke lat/lon (Open-Meteo geocoding API).
  - Simpan lokasi di `localStorage` dan kirim sebagai param ke `/api/cuaca`.
  - _Requirements: Lokasi Cuaca_

## Fase 9 — Halaman Tanaman: Ganti Hero dengan Saran AI
- [x] 23. Frontend: replace hero stats dengan card Saran AI Harian
  - Hapus hero stats lama, ganti dengan card cuaca + saran AI yang lebih prominent.
  - Saran AI sebagai konten utama di atas list tanaman.
  - _Requirements: UX Improvement_

## Fase 10 — Perawatan: Sistem Grouping
- [x] 24. Frontend: grouping di halaman Perawatan
  - Group tanaman berdasarkan komoditas (mirip LahanListPage).
  - Collapsible per grup dengan jumlah tanaman.
  - _Requirements: UX Improvement_

## Fase 11 — Chat AI (Modul Baru)
- [x] 25. Backend: migration & model ChatSession + ChatMessage
  - Tabel `chat_sessions` (id, user_id, judul, lahan_id nullable, timestamps).
  - Tabel `chat_messages` (id, session_id, role enum(user/assistant), content text, image_path nullable, timestamps).
  - _Requirements: Chat AI_

- [x] 26. Backend: endpoint Chat AI
  - `POST /api/chat/sessions` — buat sesi baru (opsional pilih lahan).
  - `GET /api/chat/sessions` — list sesi user.
  - `GET /api/chat/sessions/{id}/messages` — riwayat chat sesi.
  - `POST /api/chat/sessions/{id}/messages` — kirim pesan (teks + opsional gambar), panggil Groq AI dengan konteks riwayat + data tanaman, kembalikan respons AI.
  - Upload gambar via multipart form-data, simpan di storage.
  - _Requirements: Chat AI_

- [x] 27. Frontend: halaman Chat AI
  - Ikon tab di tengah bottom nav, bulat & timbul (raised center button) untuk kesan profesional.
  - List sesi chat + tombol "Chat Baru".
  - Halaman chat: bubble messages, input teks + tombol kamera/galeri.
  - Pilih tanaman yang dikonsultasikan (select lahan) di awal sesi atau saat chat.
  - Riwayat chat tersimpan, bisa lanjutkan sesi sebelumnya.
  - _Requirements: Chat AI_

- [x] 28. Frontend: upload/foto gambar di chat
  - Tombol attach: pilih dari galeri atau ambil foto langsung (Capacitor Camera / input file).
  - Preview gambar sebelum kirim.
  - Tampilkan gambar di bubble chat.
  - _Requirements: Chat AI_

## Fase 12 — UI/UX Chat AI (Sesuai Feedback User)
- [ ] 29. Frontend: sesuaikan tab bar saat di halaman Chat
  - Ukuran tab bar disesuaikan agar tidak mengganggu input teks.
  - _Requirements: UX Improvement_

- [ ] 30. Frontend: pindahkan selector tanaman ke dalam textarea (inline)
  - Icon @ di dalam textarea.
  - Saat diklik, modal selector muncul di bawah textarea (bukan di atas).
  - Pilih lebih dari 1 tanaman (checkbox list).
  - _Requirements: UX Improvement_

- [ ] 31. Frontend: buat checkbox tanaman lebih jelas
  - Ukuran checkbox lebih besar.
  - Warna/visual feedback lebih kontras.
  - _Requirements: UX Improvement_

