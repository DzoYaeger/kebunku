<?php

namespace Database\Seeders;

use App\Models\Lahan;
use App\Models\MusimTanam;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MusimTanamSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('username', 'yaeger')->first();
        $lahan = Lahan::where('user_id', $user->id)->get()->keyBy('nomor_bed');

        $musimData = [
            ['lahan' => 'A1', 'komoditas' => 'Tomat', 'tanggal_mulai' => '2026-05-01', 'tanggal_selesai' => null, 'status' => 'aktif', 'catatan' => 'Musim tomat pertama'],
            ['lahan' => 'A2', 'komoditas' => 'Cabai Rawit', 'tanggal_mulai' => '2026-05-05', 'tanggal_selesai' => null, 'status' => 'aktif', 'catatan' => 'Cabai rawit varietas lokal'],
            ['lahan' => 'B1', 'komoditas' => 'Kangkung', 'tanggal_mulai' => '2026-04-10', 'tanggal_selesai' => '2026-05-25', 'status' => 'selesai', 'catatan' => 'Panen 2x potong'],
            ['lahan' => 'B2', 'komoditas' => 'Bayam', 'tanggal_mulai' => '2026-05-15', 'tanggal_selesai' => null, 'status' => 'aktif', 'catatan' => 'Bayam hijau'],
            ['lahan' => 'C1', 'komoditas' => 'Jagung', 'tanggal_mulai' => '2026-06-01', 'tanggal_selesai' => null, 'status' => 'aktif', 'catatan' => 'Jagung manis - baru semai'],
            ['lahan' => 'C2', 'komoditas' => 'Terong', 'tanggal_mulai' => '2026-05-10', 'tanggal_selesai' => null, 'status' => 'aktif', 'catatan' => 'Terong ungu panjang'],
        ];

        foreach ($musimData as $data) {
            MusimTanam::create([
                'user_id' => $user->id,
                'lahan_id' => $lahan[$data['lahan']]->id,
                'client_uuid' => Str::uuid()->toString(),
                'komoditas' => $data['komoditas'],
                'tanggal_mulai' => $data['tanggal_mulai'],
                'tanggal_selesai' => $data['tanggal_selesai'],
                'status' => $data['status'],
                'catatan' => $data['catatan'],
            ]);
        }
    }
}
