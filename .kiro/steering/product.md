---
inclusion: always
---

# Product: Agrogrow / Kebunku

Agrogrow (nama aplikasi: **Kebunku**) adalah PWA manajemen kebun dan arus kas (farm & cashflow management) untuk petani/pekebun skala kecil–menengah. Aplikasi dipakai langsung di lapangan dari ponsel, sering kali tanpa koneksi internet yang stabil.

## Masalah yang Diselesaikan
- Pencatatan aktivitas kebun (semai, pindah tanam, pemupukan) masih manual dan tercecer.
- Tidak ada visibilitas arus kas: pengeluaran (beli benih, pupuk, upah) sulit dilacak.
- Sinyal di kebun buruk, sehingga aplikasi harus tetap bisa mencatat saat offline.

## Pengguna Utama
- **Pekebun / Petani** yang mengelola sejumlah bedengan/lahan dan ingin mencatat aktivitas serta keuangan dengan cepat dari HP.

## Tiga Domain Inti (sesuai navigasi bottom-tab)
1. **Lahan** — kelola bedengan/lahan: nomor bed, komoditas, status tanam.
2. **Aktivitas** — catat siklus tanam: Semai, Pindah Tanam, Pemupukan, dan aktivitas lain per lahan.
3. **Keuangan** — catat arus kas, fokus pada Kas Keluar (pengeluaran) dan ringkasan saldo.

## Prinsip Produk (jangan dilanggar)
- **Offline-first**: setiap mutasi (catat pupuk, semai, kas keluar) harus tetap berfungsi tanpa jaringan, lalu disinkronkan saat online. Tampilkan Toast *"Disimpan secara lokal (Mode Offline)"* saat offline.
- **Cepat & ringan**: target mulus 60 FPS di HP kelas menengah–bawah. Hindari animasi berat.
- **Mobile-first**: viewport target 360px–430px. Jangan hardcode lebar yang merusak layout mobile.
- **Sederhana**: input cepat, sedikit ketukan. Kurangi friksi pencatatan harian.

## Definisi Sukses MVP
- Pengguna dapat login, mengelola lahan, mencatat aktivitas (semai/pindah tanam/pupuk), dan mencatat kas keluar — seluruhnya berfungsi offline lalu tersinkron otomatis ketika online tanpa kehilangan/duplikasi data.
