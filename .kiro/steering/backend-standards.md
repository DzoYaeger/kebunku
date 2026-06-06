---
inclusion: always
---

# Backend Standards (Laravel 12+ API)

Aturan wajib untuk semua kode backend. Tujuan: API stateless, aman, konsisten, dan cepat.

## 1. Struktur Laravel 12 yang Ramping
- Laravel 12 tidak punya banyak file config terpisah. Daftarkan **middleware, exception handling, dan schedule langsung di `bootstrap/app.php`**.
- Jangan membuat ulang struktur lama (mis. `app/Http/Kernel.php`, `app/Console/Kernel.php`).

## 2. Autentikasi Stateless (Sanctum)
- Semua route API yang diamankan **wajib** memakai middleware `auth:sanctum`.
- Endpoint publik hanya: registrasi & login (penerbitan token).
- Token dikirim via header `Authorization: Bearer <token>`.

## 3. Output JSON via API Resource
- **Jangan pernah** mengembalikan model Eloquent mentah. Selalu bungkus dengan **API Resource**.
- Semua key JSON memakai format **`snake_case`** untuk konsistensi.
- Bentuk respons konsisten: data sukses dalam `data`, error mengikuti format standar Laravel (`message`, `errors`).

## 4. Type Safety & Validasi
- Manfaatkan **PHP 8.3+ type hinting** secara ketat pada argumen method dan return type (Controller, Service, Repository).
- **Semua validasi** dihandle oleh kelas **Form Request** terpisah, bukan inline di controller.
- Controller tipis: terima Form Request, delegasikan, kembalikan Resource.

## 5. Optimasi Query
- Setiap list endpoint yang menarik relasi **wajib Eager Loading** (`with()`) untuk mencegah N+1 query di MariaDB.
- Tambahkan pagination pada endpoint list besar.

## 6. Dukungan Sinkronisasi Offline
- Endpoint mutasi (create) harus menerima **`client_uuid`** (UUID dari klien) dan bersifat **idempoten**: jika `client_uuid` sudah ada, kembalikan record yang sama, bukan duplikat. Ini mencegah duplikasi saat sync queue offline diputar ulang.
- Sertakan kolom timestamp (`created_at`, `updated_at`) di payload untuk mendukung resolusi konflik di klien.

## 7. Testing
- Tulis **feature test** untuk tiap endpoint (auth, happy path, validasi gagal, idempotensi sync).
- Jalankan `php artisan test` sebelum menyatakan tugas selesai.

## Alur Membuat Fitur API (sesuai `@gen-api`)
Migration → Model → Form Request → Controller → API Resource → route di `routes/api.php` → feature test.
