# Design — Agrogrow / Kebunku MVP

## Ringkasan
Dokumen ini menjabarkan arsitektur teknis untuk memenuhi `requirements.md`. Sistem terdiri dari API Laravel 12 (stateless, Sanctum) dan PWA React/Ionic offline-first. Sumber kebenaran data adalah server (MariaDB); IndexedDB (Dexie) berperan sebagai cache lokal + sync queue.

## Arsitektur Tingkat Tinggi

```text
┌─────────────────────────── Frontend PWA (/frontend) ───────────────────────────┐
│  IonTabs Shell (Lahan · Aktivitas · Keuangan)                                   │
│      │                                                                          │
│   Pages ──► Zustand store (auth token, sync state)                              │
│      │                                                                          │
│   Repository layer ──► cek navigator.onLine                                     │
│        ├─ online  ──► API client (Axios) ──► HTTPS ──► Laravel API              │
│        └─ offline ──► Dexie (IndexedDB): tabel data + sync_queue                │
│   SyncEngine (event 'online' / interval) ──► replay queue ──► API (idempoten)   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                   │  Bearer token (Sanctum)
                                   ▼
┌─────────────────────────── Backend API (/backend) ─────────────────────────────┐
│  routes/api.php ──► auth:sanctum ──► Controllers/Api                             │
│  Form Requests (validasi) ──► Models (Eloquent) ──► API Resources (JSON)        │
│  MariaDB                                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Komponen utama:
- **API client**: Axios dengan interceptor yang menempelkan `Authorization: Bearer <token>` dan menangani 401 (logout).
- **Repository layer (frontend)**: satu titik untuk tiap domain yang memutuskan tulis ke API atau ke sync queue, dan selalu menulis salinan ke cache lokal Dexie agar UI dapat membaca offline.
- **SyncEngine**: mendengar event `online`, memutar ulang `sync_queue` berurutan, idempoten via `client_uuid`.

## Data Model (MariaDB)

Semua tabel milik pengguna menyertakan `user_id` (FK) dan `client_uuid` (CHAR(36), unik per user) untuk idempotensi sync, plus `created_at`/`updated_at`.

### users
| kolom | tipe | catatan |
|-------|------|---------|
| id | bigint PK | |
| name | string | |
| email | string unique | |
| password | string | hashed |
| timestamps | | |

### lahan
| kolom | tipe | catatan |
|-------|------|---------|
| id | bigint PK | |
| user_id | FK users | |
| client_uuid | char(36) | unique(user_id, client_uuid) |
| nomor_bed | string | unique per user |
| komoditas | string | |
| status | enum(`semai`,`aktif`,`selesai`) | default `semai` |
| catatan | text nullable | |
| timestamps | | |

### aktivitas
| kolom | tipe | catatan |
|-------|------|---------|
| id | bigint PK | |
| user_id | FK users | |
| lahan_id | FK lahan | onDelete cascade |
| client_uuid | char(36) | unique(user_id, client_uuid) |
| tipe | enum(`semai`,`pindah_tanam`,`pemupukan`) | |
| tanggal | date | |
| jenis_pupuk | string nullable | diisi bila tipe = pemupukan |
| catatan | text nullable | |
| timestamps | | |

### transaksi (Kas Keluar)
| kolom | tipe | catatan |
|-------|------|---------|
| id | bigint PK | |
| user_id | FK users | |
| client_uuid | char(36) | unique(user_id, client_uuid) |
| tipe | enum(`kas_keluar`) | MVP hanya kas keluar; disiapkan untuk perluasan |
| kategori | string | mis. benih, pupuk, upah |
| nominal | decimal(15,2) | > 0 |
| tanggal | date | |
| lahan_id | FK lahan nullable | opsional, kaitkan pengeluaran ke lahan |
| catatan | text nullable | |
| timestamps | | |

Saldo dihitung sebagai agregasi transaksi (untuk MVP: total kas keluar dikurangkan dari saldo awal/0); tidak disimpan sebagai kolom agar selalu konsisten.

## Kontrak API (prefix `/api`, JSON `snake_case`)

### Autentikasi
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/auth/register` | publik | buat akun, kembalikan token |
| POST | `/auth/login` | publik | login, kembalikan token + user |
| POST | `/auth/logout` | sanctum | cabut token aktif |
| GET | `/auth/me` | sanctum | profil pengguna saat ini |

### Lahan
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/lahan` | daftar lahan milik user (eager load relasi ringkas) |
| POST | `/lahan` | buat lahan (terima `client_uuid`, idempoten) |
| GET | `/lahan/{id}` | detail lahan |
| PUT | `/lahan/{id}` | update lahan |
| DELETE | `/lahan/{id}` | hapus lahan |

### Aktivitas
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/aktivitas` | daftar aktivitas user, eager load `lahan`, urut terbaru |
| POST | `/aktivitas` | catat aktivitas (idempoten); pindah_tanam memperbarui status lahan |
| DELETE | `/aktivitas/{id}` | hapus aktivitas |

### Keuangan
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/transaksi` | daftar transaksi + ringkasan saldo |
| POST | `/transaksi` | catat kas keluar (idempoten) |
| DELETE | `/transaksi/{id}` | hapus transaksi |

### Sinkronisasi
Tidak ada endpoint sync khusus untuk MVP. Sync dilakukan dengan memutar ulang operasi CRUD normal di atas. Idempotensi dijamin oleh `client_uuid`.

### Bentuk Respons
- Sukses tunggal: `{ "data": { ... } }`
- Sukses list: `{ "data": [ ... ], "meta": { ...pagination... } }`
- Error validasi (422): `{ "message": "...", "errors": { "field": ["..."] } }`

### Pola Idempotensi (server)
Pada setiap `POST` create, controller melakukan `firstOrCreate` berdasarkan `(user_id, client_uuid)`:
- jika belum ada → buat record baru;
- jika sudah ada → kembalikan record yang ada dengan status 200/201 yang sama, tanpa duplikat.

## Desain Frontend

### Skema Dexie (IndexedDB) — selaras dengan tabel MariaDB
```ts
// src/db/index.ts
db.version(1).stores({
  lahan:     'client_uuid, server_id, status, _dirty',
  aktivitas: 'client_uuid, server_id, lahan_uuid, tanggal, _dirty',
  transaksi: 'client_uuid, server_id, tanggal, _dirty',
  sync_queue:'++id, entity, op, client_uuid, status, created_at'
});
```
- Setiap record lokal dikunci oleh `client_uuid` (dibuat saat input). `server_id` diisi setelah sync sukses.
- `_dirty` menandai record yang belum tersinkron.

### Sync Queue Item
```ts
interface SyncItem {
  id?: number;
  entity: 'lahan' | 'aktivitas' | 'transaksi';
  op: 'create' | 'update' | 'delete';
  client_uuid: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'failed';
  attempts: number;
  created_at: string;
}
```

### Alur Mutasi (repository)
1. Buat `client_uuid` (uuid v4) dan tulis record ke tabel Dexie dengan `_dirty = true`.
2. `if (navigator.onLine)` → kirim ke API; pada sukses set `server_id`, `_dirty = false`. Pada gagal jaringan → masuk `sync_queue`.
3. `else` → push ke `sync_queue` (status `pending`) dan tampilkan Toast *"Disimpan secara lokal (Mode Offline)"*.
4. UI selalu membaca dari Dexie sehingga konsisten online maupun offline.

### SyncEngine
- Dipicu oleh: event `window 'online'`, saat app start (jika online), dan interval ringan.
- Memproses `sync_queue` berurutan (FIFO):
  - kirim payload + `client_uuid` ke endpoint terkait;
  - sukses → update record lokal dengan `server_id`, hapus item dari queue;
  - gagal jaringan → biarkan di queue, naikkan `attempts`, retry siklus berikutnya (Req 5.5);
  - gagal validasi (4xx) → set status `failed`, beri tahu pengguna, jangan retry tanpa batas (Req 5.6).
- Expose jumlah item `pending` ke store untuk indikator status (Req 5.8).

### State (Zustand)
- `authStore`: `token`, `user`, `login()`, `logout()` — token dipersist agar sesi bertahan.
- `syncStore`: `pendingCount`, `isOnline`, `lastSyncedAt`.

### Struktur Halaman (per domain)
- `pages/Lahan/`: `LahanListPage`, `LahanFormModal`, `LahanCard` (badge status).
- `pages/Aktivitas/`: `AktivitasListPage`, `AktivitasFormModal` (pilih tipe & lahan), `AktivitasItem` (badge tipe).
- `pages/Keuangan/`: `KeuanganPage` (kartu ringkasan saldo + list), `TransaksiFormModal`, `TransaksiItem` (badge rose, format Rupiah).
- `App.tsx`: `IonTabs` shell; ikon outline/filled emerald sesuai design-system.

### Lifecycle & Performa
- Fetch data aktif via `useIonViewWillEnter` (Req frontend-standards).
- List panjang memakai virtualisasi/conditional rendering untuk menjaga 60 FPS.
- Format Rupiah via `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.

## Keamanan
- Semua endpoint selain register/login diproteksi `auth:sanctum`.
- Otorisasi kepemilikan: setiap query difilter `where('user_id', auth id)` agar pengguna hanya mengakses datanya sendiri (cegah IDOR).
- Token disimpan di klien dengan pola konsisten; interceptor menangani 401 dengan logout.
- Validasi ketat di Form Request (nominal > 0, enum status/tipe, keunikan nomor_bed per user).

## Strategi Pengujian
- **Backend (feature test):** auth (register/login/logout/me), CRUD tiap domain, filter kepemilikan, idempotensi `client_uuid` (POST dua kali → satu record), validasi gagal.
- **Frontend:** unit test repository (online vs offline path), test SyncEngine (replay sukses, retry gagal jaringan, mark failed pada 422), test format Rupiah & badge status.
- **Manual/e2e ringan:** matikan jaringan → catat data → nyalakan → verifikasi tersinkron tanpa duplikat.

## Penelusuran ke Requirements
| Requirement | Ditangani oleh |
|-------------|----------------|
| R1 Auth | Endpoint `/auth/*`, Sanctum, authStore, interceptor 401 |
| R2 Lahan | Tabel `lahan`, `/lahan/*`, halaman Lahan, badge status |
| R3 Aktivitas | Tabel `aktivitas`, `/aktivitas/*`, update status saat pindah tanam |
| R4 Keuangan | Tabel `transaksi`, `/transaksi/*`, agregasi saldo, format Rupiah |
| R5 Offline-Sync | Dexie schema, repository, SyncEngine, `client_uuid` idempoten |
| R6 Navigasi/PWA | `IonTabs` shell, vite-plugin-pwa, responsif 360–430px |
