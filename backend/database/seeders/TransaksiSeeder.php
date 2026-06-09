<?php

namespace Database\Seeders;

use App\Models\Lahan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TransaksiSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('username', 'yaeger')->first();
        $lahan = Lahan::where('user_id', $user->id)->get()->keyBy('nomor_bed');

        $transaksiData = [
            // Kas Keluar
            ['tipe' => 'kas_keluar', 'kategori' => 'Benih', 'komoditas' => 'Tomat', 'nominal' => 25000, 'tanggal' => '2026-04-25', 'lahan' => 'A1', 'catatan' => 'Beli benih tomat hibrida'],
            ['tipe' => 'kas_keluar', 'kategori' => 'Benih', 'komoditas' => 'Cabai Rawit', 'nominal' => 30000, 'tanggal' => '2026-04-28', 'lahan' => 'A2', 'catatan' => 'Beli benih cabai rawit'],
            ['tipe' => 'kas_keluar', 'kategori' => 'Pupuk', 'komoditas' => 'Tomat', 'nominal' => 85000, 'tanggal' => '2026-05-15', 'lahan' => 'A1', 'catatan' => 'NPK 16-16-16 5kg'],
            ['tipe' => 'kas_keluar', 'kategori' => 'Pestisida', 'komoditas' => 'Tomat', 'nominal' => 45000, 'tanggal' => '2026-05-20', 'lahan' => 'A1', 'catatan' => 'Abamektin 100ml'],
            ['tipe' => 'kas_keluar', 'kategori' => 'Pupuk', 'komoditas' => 'Cabai Rawit', 'nominal' => 60000, 'tanggal' => '2026-05-20', 'lahan' => 'A2', 'catatan' => 'KCl 3kg'],
            ['tipe' => 'kas_keluar', 'kategori' => 'Benih', 'komoditas' => 'Kangkung', 'nominal' => 10000, 'tanggal' => '2026-04-05', 'lahan' => 'B1', 'catatan' => 'Benih kangkung 100g'],
            ['tipe' => 'kas_keluar', 'kategori' => 'Benih', 'komoditas' => 'Jagung', 'nominal' => 50000, 'tanggal' => '2026-06-01', 'lahan' => 'C1', 'catatan' => 'Benih jagung manis 500g'],
            ['tipe' => 'kas_keluar', 'kategori' => 'Upah', 'komoditas' => null, 'nominal' => 150000, 'tanggal' => '2026-05-10', 'lahan' => null, 'catatan' => 'Upah bantu pindah tanam'],
            // Kas Masuk
            ['tipe' => 'kas_masuk', 'kategori' => 'Penjualan', 'komoditas' => 'Kangkung', 'nominal' => 120000, 'tanggal' => '2026-05-15', 'lahan' => 'B1', 'catatan' => 'Jual kangkung 12kg @10rb'],
            ['tipe' => 'kas_masuk', 'kategori' => 'Penjualan', 'komoditas' => 'Kangkung', 'nominal' => 80000, 'tanggal' => '2026-05-25', 'lahan' => 'B1', 'catatan' => 'Jual kangkung 8kg'],
        ];

        foreach ($transaksiData as $data) {
            Transaksi::create([
                'user_id' => $user->id,
                'client_uuid' => Str::uuid()->toString(),
                'tipe' => $data['tipe'],
                'kategori' => $data['kategori'],
                'komoditas' => $data['komoditas'],
                'nominal' => $data['nominal'],
                'tanggal' => $data['tanggal'],
                'lahan_id' => $data['lahan'] ? $lahan[$data['lahan']]->id : null,
                'catatan' => $data['catatan'],
            ]);
        }
    }
}
