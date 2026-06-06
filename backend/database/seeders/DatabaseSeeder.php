<?php

namespace Database\Seeders;

use App\Models\Aktivitas;
use App\Models\Lahan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Akun demo untuk login.
        $user = User::updateOrCreate(
            ['email' => 'pekebun@kebunku.test'],
            [
                'name' => 'Pak Tani',
                'password' => Hash::make('password'),
            ],
        );

        // Akun kedua (untuk uji isolasi data antar pengguna).
        User::updateOrCreate(
            ['email' => 'demo@kebunku.test'],
            [
                'name' => 'Bu Sri',
                'password' => Hash::make('password'),
            ],
        );

        // Hindari duplikasi bila seeder dijalankan ulang.
        if ($user->lahan()->exists()) {
            return;
        }

        // --- Lahan ---
        $cabai = Lahan::create([
            'user_id' => $user->id,
            'client_uuid' => (string) Str::uuid(),
            'nomor_bed' => 'BED-01',
            'komoditas' => 'Cabai Merah',
            'status' => 'aktif',
            'catatan' => 'Bedengan utara dekat sumur.',
        ]);

        $tomat = Lahan::create([
            'user_id' => $user->id,
            'client_uuid' => (string) Str::uuid(),
            'nomor_bed' => 'BED-02',
            'komoditas' => 'Tomat',
            'status' => 'semai',
            'catatan' => null,
        ]);

        $selada = Lahan::create([
            'user_id' => $user->id,
            'client_uuid' => (string) Str::uuid(),
            'nomor_bed' => 'BED-03',
            'komoditas' => 'Selada',
            'status' => 'selesai',
            'catatan' => 'Sudah panen, siap rotasi.',
        ]);

        // --- Aktivitas ---
        Aktivitas::create([
            'user_id' => $user->id,
            'lahan_id' => $cabai->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'semai',
            'tanggal' => '2026-05-01',
            'catatan' => 'Semai benih cabai di tray.',
        ]);

        Aktivitas::create([
            'user_id' => $user->id,
            'lahan_id' => $cabai->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'pindah_tanam',
            'tanggal' => '2026-05-15',
            'catatan' => 'Pindah ke bedengan.',
        ]);

        Aktivitas::create([
            'user_id' => $user->id,
            'lahan_id' => $cabai->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'pemupukan',
            'tanggal' => '2026-05-28',
            'jenis_pupuk' => 'NPK 16-16-16',
            'catatan' => 'Pemupukan susulan pertama.',
        ]);

        Aktivitas::create([
            'user_id' => $user->id,
            'lahan_id' => $tomat->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'semai',
            'tanggal' => '2026-06-02',
            'catatan' => null,
        ]);

        // --- Transaksi (Kas Keluar) ---
        Transaksi::create([
            'user_id' => $user->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'kas_keluar',
            'kategori' => 'benih',
            'nominal' => 75000,
            'tanggal' => '2026-05-01',
            'lahan_id' => $cabai->id,
            'catatan' => 'Beli benih cabai 2 sachet.',
        ]);

        Transaksi::create([
            'user_id' => $user->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'kas_keluar',
            'kategori' => 'pupuk',
            'nominal' => 120000,
            'tanggal' => '2026-05-28',
            'lahan_id' => $cabai->id,
            'catatan' => 'NPK 16-16-16 5 kg.',
        ]);

        Transaksi::create([
            'user_id' => $user->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'kas_keluar',
            'kategori' => 'upah',
            'nominal' => 150000,
            'tanggal' => '2026-05-15',
            'lahan_id' => null,
            'catatan' => 'Upah tenaga pindah tanam.',
        ]);

        Transaksi::create([
            'user_id' => $user->id,
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'kas_keluar',
            'kategori' => 'benih',
            'nominal' => 45000,
            'tanggal' => '2026-06-02',
            'lahan_id' => $tomat->id,
            'catatan' => 'Benih tomat.',
        ]);

        $this->command->info('Seeder selesai. Login: pekebun@kebunku.test / password');
        $this->command->info('Total kas keluar demo: Rp 390.000 (saldo -390.000).');
        // selada disertakan sebagai contoh status "selesai".
        unset($selada);
    }
}
