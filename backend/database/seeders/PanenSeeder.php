<?php

namespace Database\Seeders;

use App\Models\Lahan;
use App\Models\Panen;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PanenSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('username', 'yaeger')->first();
        $lahan = Lahan::where('user_id', $user->id)->get()->keyBy('nomor_bed');

        $panenData = [
            ['lahan' => 'B1', 'tanggal' => '2026-05-10', 'berat' => 12.0, 'grade' => 'A', 'harga_jual' => 120000, 'pembeli' => 'Pasar Pagi', 'catatan' => 'Potong pertama kangkung'],
            ['lahan' => 'B1', 'tanggal' => '2026-05-20', 'berat' => 8.5, 'grade' => 'A', 'harga_jual' => 85000, 'pembeli' => 'Warung Bu Sari', 'catatan' => 'Potong kedua kangkung'],
            ['lahan' => 'B1', 'tanggal' => '2026-05-25', 'berat' => 5.0, 'grade' => 'B', 'harga_jual' => 40000, 'pembeli' => 'Tetangga', 'catatan' => 'Sisa potong terakhir'],
            ['lahan' => 'A1', 'tanggal' => '2026-06-05', 'berat' => 3.2, 'grade' => 'A', 'harga_jual' => 64000, 'pembeli' => 'Pasar Pagi', 'catatan' => 'Panen tomat perdana'],
        ];

        foreach ($panenData as $data) {
            Panen::create([
                'user_id' => $user->id,
                'lahan_id' => $lahan[$data['lahan']]->id,
                'client_uuid' => Str::uuid()->toString(),
                'tanggal' => $data['tanggal'],
                'berat' => $data['berat'],
                'grade' => $data['grade'],
                'harga_jual' => $data['harga_jual'],
                'pembeli' => $data['pembeli'],
                'catatan' => $data['catatan'],
            ]);
        }
    }
}
