<?php

namespace Database\Factories;

use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Transaksi>
 */
class TransaksiFactory extends Factory
{
    protected $model = Transaksi::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'client_uuid' => (string) Str::uuid(),
            'tipe' => 'kas_keluar',
            'kategori' => fake()->randomElement(['benih', 'pupuk', 'upah']),
            'nominal' => fake()->numberBetween(10000, 500000),
            'tanggal' => fake()->date(),
            'lahan_id' => null,
            'catatan' => null,
        ];
    }
}
