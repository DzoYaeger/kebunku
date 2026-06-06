<?php

namespace Tests\Feature;

use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TransaksiTest extends TestCase
{
    use RefreshDatabase;

    public function test_catat_kas_keluar(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/transaksi', [
                'client_uuid' => (string) Str::uuid(),
                'kategori' => 'benih',
                'nominal' => 50000,
                'tanggal' => '2026-06-01',
            ])
            ->assertCreated()
            ->assertJsonPath('data.kategori', 'benih')
            ->assertJsonPath('data.tipe', 'kas_keluar');
    }

    public function test_nominal_nol_atau_negatif_ditolak(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/transaksi', [
                'client_uuid' => (string) Str::uuid(),
                'kategori' => 'benih',
                'nominal' => 0,
                'tanggal' => '2026-06-01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nominal');
    }

    public function test_index_menghitung_saldo(): void
    {
        $user = User::factory()->create();
        Transaksi::factory()->create(['user_id' => $user->id, 'nominal' => 30000]);
        Transaksi::factory()->create(['user_id' => $user->id, 'nominal' => 20000]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/transaksi')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total_kas_keluar', '50000.00')
            ->assertJsonPath('meta.saldo', '-50000.00');
    }

    public function test_idempoten(): void
    {
        $user = User::factory()->create();
        $payload = [
            'client_uuid' => (string) Str::uuid(),
            'kategori' => 'pupuk',
            'nominal' => 75000,
            'tanggal' => '2026-06-01',
        ];

        $this->actingAs($user, 'sanctum')->postJson('/api/transaksi', $payload)->assertCreated();
        $this->actingAs($user, 'sanctum')->postJson('/api/transaksi', $payload)->assertOk();

        $this->assertSame(1, Transaksi::where('user_id', $user->id)->count());
    }

    public function test_hapus_menyesuaikan_saldo(): void
    {
        $user = User::factory()->create();
        $t = Transaksi::factory()->create(['user_id' => $user->id, 'nominal' => 40000]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/transaksi/{$t->id}")
            ->assertNoContent();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/transaksi')
            ->assertJsonPath('meta.saldo', '0.00');
    }

    public function test_tidak_bisa_hapus_transaksi_user_lain(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();
        $t = Transaksi::factory()->create(['user_id' => $lain->id]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/transaksi/{$t->id}")
            ->assertStatus(404);
    }
}
