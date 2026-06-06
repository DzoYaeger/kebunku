<?php

namespace Database\Factories;

use App\Models\Aktivitas;
use App\Models\Lahan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Aktivitas>
 */
class AktivitasFactory extends Factory
{
    protected $model = Aktivitas::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'lahan_id' => Lahan::factory(),
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'semai',
            'tanggal' => fake()->date(),
            'jenis_pupuk' => null,
            'catatan' => null,
        ];
    }
}
