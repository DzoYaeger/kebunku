<?php

namespace Database\Factories;

use App\Models\Lahan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Lahan>
 */
class LahanFactory extends Factory
{
    protected $model = Lahan::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'client_uuid' => (string) Str::uuid(),
            'nomor_bed' => 'BED-'.fake()->unique()->numberBetween(1, 9999),
            'komoditas' => fake()->randomElement(['Cabai', 'Tomat', 'Selada', 'Bayam']),
            'status' => 'semai',
            'catatan' => null,
        ];
    }
}
