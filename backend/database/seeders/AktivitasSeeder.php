<?php

namespace Database\Seeders;

use App\Models\Aktivitas;
use App\Models\Lahan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AktivitasSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('username', 'yaeger')->first();
        $lahan = Lahan::where('user_id', $user->id)->get()->keyBy('nomor_bed');

        $aktivitasData = [
            ['lahan' => 'A1', 'tipe' => 'semai', 'tanggal' => '2026-04-25', 'catatan' => 'Semai tomat di tray'],
            ['lahan' => 'A1', 'tipe' => 'pindah_tanam', 'tanggal' => '2026-05-01', 'catatan' => 'Pindah ke bedengan A1'],
            ['lahan' => 'A1', 'tipe' => 'pemupukan', 'tanggal' => '2026-05-15', 'jenis_pupuk' => 'NPK 16-16-16', 'catatan' => 'Pupuk susulan pertama'],
            ['lahan' => 'A1', 'tipe' => 'pestisida', 'tanggal' => '2026-05-20', 'jenis_pestisida' => 'Abamektin', 'catatan' => 'Semprot kutu daun'],
            ['lahan' => 'A2', 'tipe' => 'semai', 'tanggal' => '2026-04-28', 'catatan' => 'Semai cabai rawit'],
            ['lahan' => 'A2', 'tipe' => 'pindah_tanam', 'tanggal' => '2026-05-05', 'catatan' => 'Pindah tanam cabai'],
            ['lahan' => 'A2', 'tipe' => 'pemupukan', 'tanggal' => '2026-05-20', 'jenis_pupuk' => 'KCl', 'catatan' => 'Pupuk kalium untuk buah'],
            ['lahan' => 'B1', 'tipe' => 'semai', 'tanggal' => '2026-04-05', 'catatan' => 'Tabur benih kangkung'],
            ['lahan' => 'B1', 'tipe' => 'pindah_tanam', 'tanggal' => '2026-04-10', 'catatan' => 'Kangkung langsung tanam'],
            ['lahan' => 'B2', 'tipe' => 'semai', 'tanggal' => '2026-05-10', 'catatan' => 'Semai bayam'],
            ['lahan' => 'B2', 'tipe' => 'pindah_tanam', 'tanggal' => '2026-05-15', 'catatan' => 'Pindah tanam bayam'],
            ['lahan' => 'C1', 'tipe' => 'semai', 'tanggal' => '2026-06-01', 'catatan' => 'Semai jagung manis'],
            ['lahan' => 'C2', 'tipe' => 'semai', 'tanggal' => '2026-05-03', 'catatan' => 'Semai terong ungu'],
            ['lahan' => 'C2', 'tipe' => 'pindah_tanam', 'tanggal' => '2026-05-10', 'catatan' => 'Pindah tanam terong'],
            ['lahan' => 'C2', 'tipe' => 'pemupukan', 'tanggal' => '2026-05-25', 'jenis_pupuk' => 'Urea', 'catatan' => 'Pupuk nitrogen'],
        ];

        foreach ($aktivitasData as $data) {
            $lahanItem = $lahan[$data['lahan']];

            Aktivitas::create([
                'user_id' => $user->id,
                'lahan_id' => $lahanItem->id,
                'client_uuid' => Str::uuid()->toString(),
                'tipe' => $data['tipe'],
                'tanggal' => $data['tanggal'],
                'jenis_pupuk' => $data['jenis_pupuk'] ?? null,
                'jenis_pestisida' => $data['jenis_pestisida'] ?? null,
                'catatan' => $data['catatan'] ?? null,
            ]);
        }
    }
}
