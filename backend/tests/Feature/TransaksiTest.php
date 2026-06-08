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
        Transaksi::factory()->create(['user_id' => $user->id, 'tipe' => 'kas_keluar', 'nominal' => 30000]);
        Transaksi::factory()->create(['user_id' => $user->id, 'tipe' => 'kas_keluar', 'nominal' => 20000]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/transaksi')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total_kas_keluar', '50000.00')
            ->assertJsonPath('meta.total_kas_masuk', '0.00')
            ->assertJsonPath('meta.saldo', '-50000.00');
    }

    public function test_catat_kas_masuk(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/transaksi', [
                'client_uuid' => (string) Str::uuid(),
                'tipe' => 'kas_masuk',
                'kategori' => 'penjualan',
                'komoditas' => 'cabai',
                'nominal' => 100000,
                'tanggal' => '2026-06-08',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipe', 'kas_masuk')
            ->assertJsonPath('data.komoditas', 'cabai');
    }

    public function test_kas_masuk_wajib_komoditas(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/transaksi', [
                'client_uuid' => (string) Str::uuid(),
                'tipe' => 'kas_masuk',
                'kategori' => 'penjualan',
                'nominal' => 50000,
                'tanggal' => '2026-06-08',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('komoditas');
    }

    public function test_saldo_masuk_minus_keluar(): void
    {
        $user = User::factory()->create();
        Transaksi::factory()->create(['user_id' => $user->id, 'tipe' => 'kas_masuk', 'komoditas' => 'cabai', 'nominal' => 100000]);
        Transaksi::factory()->create(['user_id' => $user->id, 'tipe' => 'kas_keluar', 'nominal' => 30000]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/transaksi')
            ->assertOk()
            ->assertJsonPath('meta.total_kas_masuk', '100000.00')
            ->assertJsonPath('meta.total_kas_keluar', '30000.00')
            ->assertJsonPath('meta.saldo', '70000.00');
    }

    public function test_ringkasan_komoditas(): void
    {
        $user = User::factory()->create();
        Transaksi::factory()->create(['user_id' => $user->id, 'tipe' => 'kas_masuk', 'komoditas' => 'cabai', 'nominal' => 50000]);
        Transaksi::factory()->create(['user_id' => $user->id, 'tipe' => 'kas_masuk', 'komoditas' => 'cabai', 'nominal' => 30000]);
        Transaksi::factory()->create(['user_id' => $user->id, 'tipe' => 'kas_masuk', 'komoditas' => 'tomat', 'nominal' => 20000]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/transaksi/ringkasan-komoditas')
            ->assertOk();

        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertEquals('cabai', $data[0]['komoditas']);
        $this->assertEquals(80000, $data[0]['total']);
        $this->assertEquals('tomat', $data[1]['komoditas']);
        $this->assertEquals(20000, $data[1]['total']);
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
