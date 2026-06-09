<?php

namespace Database\Seeders;

use App\Models\Lahan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LahanSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('username', 'yaeger')->first();

        $lahanData = [
            ['nomor_bed' => 'A1', 'komoditas' => 'Tomat', 'icon' => '🍅', 'status' => 'aktif', 'tanggal_tanam' => '2026-05-01'],
            ['nomor_bed' => 'A2', 'komoditas' => 'Cabai Rawit', 'icon' => '🌶️', 'status' => 'aktif', 'tanggal_tanam' => '2026-05-05'],
            ['nomor_bed' => 'B1', 'komoditas' => 'Kangkung', 'icon' => '🥬', 'status' => 'selesai', 'tanggal_tanam' => '2026-04-10'],
            ['nomor_bed' => 'B2', 'komoditas' => 'Bayam', 'icon' => '🌿', 'status' => 'aktif', 'tanggal_tanam' => '2026-05-15'],
            ['nomor_bed' => 'C1', 'komoditas' => 'Jagung', 'icon' => '🌽', 'status' => 'semai', 'tanggal_tanam' => '2026-06-01'],
            ['nomor_bed' => 'C2', 'komoditas' => 'Terong', 'icon' => '🍆', 'status' => 'aktif', 'tanggal_tanam' => '2026-05-10'],
        ];

        foreach ($lahanData as $data) {
            Lahan::updateOrCreate(
                ['user_id' => $user->id, 'nomor_bed' => $data['nomor_bed']],
                array_merge($data, [
                    'user_id' => $user->id,
                    'client_uuid' => Str::uuid()->toString(),
                ]),
            );
        }
    }
}
