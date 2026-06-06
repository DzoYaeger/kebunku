<?php

namespace Tests\Feature;

use App\Models\Lahan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LahanTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_hanya_menampilkan_lahan_milik_user(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();
        Lahan::factory()->count(2)->create(['user_id' => $user->id]);
        Lahan::factory()->create(['user_id' => $lain->id]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/lahan')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_store_membuat_lahan(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/lahan', [
                'client_uuid' => (string) Str::uuid(),
                'nomor_bed' => 'BED-01',
                'komoditas' => 'Cabai',
            ])
            ->assertCreated()
            ->assertJsonPath('data.nomor_bed', 'BED-01')
            ->assertJsonPath('data.status', 'semai');
    }

    public function test_store_idempoten_client_uuid_sama_tidak_duplikat(): void
    {
        $user = User::factory()->create();
        $uuid = (string) Str::uuid();
        $payload = [
            'client_uuid' => $uuid,
            'nomor_bed' => 'BED-09',
            'komoditas' => 'Tomat',
        ];

        $first = $this->actingAs($user, 'sanctum')->postJson('/api/lahan', $payload);
        $first->assertCreated();

        $second = $this->actingAs($user, 'sanctum')->postJson('/api/lahan', $payload);
        $second->assertOk();

        $this->assertSame(1, Lahan::where('user_id', $user->id)->where('client_uuid', $uuid)->count());
        $this->assertSame($first->json('data.id'), $second->json('data.id'));
    }

    public function test_store_nomor_bed_duplikat_ditolak(): void
    {
        $user = User::factory()->create();
        Lahan::factory()->create(['user_id' => $user->id, 'nomor_bed' => 'BED-DUP']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/lahan', [
                'client_uuid' => (string) Str::uuid(),
                'nomor_bed' => 'BED-DUP',
                'komoditas' => 'Selada',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nomor_bed');
    }

    public function test_update_lahan(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id, 'status' => 'semai']);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/lahan/{$lahan->id}", [
                'nomor_bed' => $lahan->nomor_bed,
                'komoditas' => 'Bayam',
                'status' => 'aktif',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'aktif')
            ->assertJsonPath('data.komoditas', 'Bayam');
    }

    public function test_tidak_bisa_akses_lahan_user_lain(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $lain->id]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/lahan/{$lahan->id}")
            ->assertStatus(404);
    }

    public function test_destroy_lahan(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/lahan/{$lahan->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('lahan', ['id' => $lahan->id]);
    }
}
