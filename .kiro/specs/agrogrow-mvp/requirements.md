# Requirements — Agrogrow / Kebunku MVP

## Pendahuluan
Agrogrow (Kebunku) adalah PWA offline-first untuk manajemen kebun dan arus kas. MVP mencakup lima area: Autentikasi, Lahan, Aktivitas (Semai / Pindah Tanam / Pemupukan), Keuangan (Kas Keluar), dan Sinkronisasi Offline. Dokumen ini memakai notasi EARS (Easy Approach to Requirements Syntax).

Glosarium:
- **Lahan/Bed**: satuan area tanam yang punya nomor bed, komoditas, dan status.
- **Aktivitas**: catatan kejadian pada sebuah lahan (semai, pindah tanam, pemupukan).
- **Kas Keluar**: transaksi pengeluaran yang mengurangi saldo.
- **Sync Queue**: antrean mutasi lokal (IndexedDB/Dexie) yang menunggu dikirim ke server.
- **client_uuid**: UUID yang dibuat klien untuk tiap mutasi agar pengiriman idempoten.

---

## Requirement 1: Autentikasi (Sanctum)
**User Story:** Sebagai pekebun, saya ingin mendaftar dan login dengan aman, agar data kebun saya bersifat pribadi dan tersinkron dengan akun saya.

#### Acceptance Criteria
1. WHEN pengguna mengirim data registrasi yang valid (nama, email unik, password) THE SYSTEM SHALL membuat akun baru dan mengembalikan token Sanctum.
2. IF email sudah terdaftar saat registrasi THEN THE SYSTEM SHALL menolak permintaan dengan error validasi dan tidak membuat akun.
3. WHEN pengguna login dengan kredensial benar THE SYSTEM SHALL mengembalikan token Sanctum beserta data profil pengguna.
4. IF kredensial login salah THEN THE SYSTEM SHALL mengembalikan error 401 tanpa membocorkan apakah email atau password yang salah.
5. WHILE pengguna belum terautentikasi THE SYSTEM SHALL menolak akses ke seluruh endpoint terproteksi dengan status 401.
6. WHEN pengguna melakukan logout THE SYSTEM SHALL mencabut token aktif sehingga tidak dapat dipakai lagi.
7. WHERE token tersimpan di klien THE SYSTEM SHALL mempertahankan sesi login setelah aplikasi ditutup dan dibuka kembali.

---

## Requirement 2: Manajemen Lahan
**User Story:** Sebagai pekebun, saya ingin mengelola daftar lahan/bedengan, agar saya tahu komoditas apa yang ditanam dan status tiap lahan.

#### Acceptance Criteria
1. WHEN pengguna membuka tab Lahan THE SYSTEM SHALL menampilkan daftar lahan milik pengguna beserta nomor bed, komoditas, dan badge status.
2. WHEN pengguna menyimpan lahan baru dengan nomor bed dan komoditas yang valid THE SYSTEM SHALL membuat lahan dengan status awal yang sesuai dan menampilkannya di daftar.
3. IF input lahan tidak valid (nomor bed kosong/duplikat untuk pengguna yang sama) THEN THE SYSTEM SHALL menolak penyimpanan dan menampilkan pesan validasi.
4. WHEN pengguna mengubah data lahan THE SYSTEM SHALL menyimpan perubahan dan memperbarui tampilan.
5. WHEN pengguna menghapus lahan THE SYSTEM SHALL meminta konfirmasi sebelum menghapus.
6. THE SYSTEM SHALL menampilkan status lahan menggunakan badge sesuai design system (Semai = amber, Aktif/Pindah Tanam = green).
7. WHERE daftar lahan panjang THE SYSTEM SHALL merender daftar secara efisien agar tetap mulus di HP kelas menengah.

---

## Requirement 3: Aktivitas (Semai, Pindah Tanam, Pemupukan)
**User Story:** Sebagai pekebun, saya ingin mencatat aktivitas pada tiap lahan, agar siklus tanam terdokumentasi dengan rapi.

#### Acceptance Criteria
1. WHEN pengguna mencatat aktivitas Semai pada sebuah lahan THE SYSTEM SHALL menyimpan tanggal dan detail semai serta mengaitkannya dengan lahan tersebut.
2. WHEN pengguna mencatat Pindah Tanam pada sebuah lahan THE SYSTEM SHALL menyimpan catatan dan memperbarui status lahan menjadi Aktif/Pindah Tanam.
3. WHEN pengguna mencatat Pemupukan THE SYSTEM SHALL menyimpan jenis pupuk, tanggal, dan lahan terkait.
4. IF aktivitas dicatat tanpa lahan terkait yang valid THEN THE SYSTEM SHALL menolak penyimpanan dengan pesan validasi.
5. WHEN pengguna membuka tab Aktivitas THE SYSTEM SHALL menampilkan riwayat aktivitas terurut dari terbaru, masing-masing dengan tipe, tanggal, dan lahan terkait.
6. THE SYSTEM SHALL menampilkan tipe aktivitas dengan badge warna sesuai design system.
7. WHEN aktivitas Pemupukan menimbulkan pengeluaran THE SYSTEM SHALL memungkinkan pengguna mencatatnya sebagai Kas Keluar terkait (opsional, tidak wajib).

---

## Requirement 4: Keuangan (Kas Keluar & Saldo)
**User Story:** Sebagai pekebun, saya ingin mencatat pengeluaran dan melihat ringkasan saldo, agar arus kas kebun terlacak.

#### Acceptance Criteria
1. WHEN pengguna mencatat Kas Keluar dengan nominal > 0, kategori, dan tanggal valid THE SYSTEM SHALL menyimpan transaksi dan mengurangi saldo.
2. IF nominal Kas Keluar <= 0 atau kosong THEN THE SYSTEM SHALL menolak penyimpanan dengan pesan validasi.
3. WHEN pengguna membuka tab Keuangan THE SYSTEM SHALL menampilkan ringkasan saldo dan daftar transaksi terurut dari terbaru.
4. THE SYSTEM SHALL menampilkan transaksi Kas Keluar dengan badge rose sesuai design system.
5. WHERE nominal ditampilkan THE SYSTEM SHALL memformatnya sebagai mata uang Rupiah (IDR) yang terbaca.
6. WHEN pengguna menghapus transaksi THE SYSTEM SHALL meminta konfirmasi dan menyesuaikan ulang saldo setelah penghapusan.

---

## Requirement 5: Sinkronisasi Offline-First
**User Story:** Sebagai pekebun yang bekerja di lapangan dengan sinyal buruk, saya ingin tetap bisa mencatat data saat offline dan otomatis tersinkron saat online, tanpa kehilangan atau menduplikasi data.

#### Acceptance Criteria
1. WHEN pengguna melakukan mutasi data (lahan, aktivitas, kas keluar) WHILE perangkat offline THE SYSTEM SHALL menyimpan mutasi ke sync queue IndexedDB (Dexie) dan menampilkan Toast *"Disimpan secara lokal (Mode Offline)"*.
2. WHILE perangkat offline THE SYSTEM SHALL tetap menampilkan data yang sudah tersimpan lokal sehingga aplikasi tetap berfungsi.
3. WHEN koneksi jaringan kembali tersedia THE SYSTEM SHALL memutar ulang sync queue secara berurutan dan mengirim tiap mutasi ke server.
4. WHEN klien mengirim mutasi THE SYSTEM SHALL menyertakan `client_uuid`, DAN server SHALL memperlakukan permintaan secara idempoten sehingga `client_uuid` yang sama tidak membuat record duplikat.
5. IF pengiriman sebuah item sync gagal karena error jaringan THEN THE SYSTEM SHALL mempertahankan item di queue dan mencoba lagi pada siklus sync berikutnya.
6. IF server menolak item karena error validasi (bukan jaringan) THEN THE SYSTEM SHALL menandai item sebagai gagal dan memberi tahu pengguna alih-alih mencoba selamanya.
7. WHEN sebuah item berhasil tersinkron THE SYSTEM SHALL memperbarui record lokal dengan id server dan menghapus item dari queue.
8. THE SYSTEM SHALL menampilkan indikator status sinkronisasi (mis. jumlah item yang menunggu sync).

---

## Requirement 6: Shell Navigasi & Pengalaman PWA
**User Story:** Sebagai pengguna mobile, saya ingin navigasi cepat antar domain dan aplikasi yang bisa dipasang, agar pemakaian harian nyaman.

#### Acceptance Criteria
1. THE SYSTEM SHALL menyediakan bottom tab navigation (`IonTabs`) dengan tiga tab: Lahan, Aktivitas, Keuangan.
2. WHILE sebuah tab aktif THE SYSTEM SHALL menampilkan ikonnya dengan gaya `filled` emerald; WHILE tidak aktif SHALL memakai gaya `outline`.
3. THE SYSTEM SHALL responsif penuh pada viewport 360px–430px tanpa layout rusak.
4. THE SYSTEM SHALL dapat dipasang sebagai PWA dengan service worker (vite-plugin-pwa) sehingga dapat dibuka tanpa jaringan.
5. THE SYSTEM SHALL menjaga performa render mulus (target 60 FPS) di HP kelas menengah.
