<?php

namespace Tests\Feature;

use App\Models\Aktivitas;
use App\Models\Lahan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AktivitasTest extends TestCase
{
    use RefreshDatabase;

    public function test_catat_semai(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/aktivitas', [
                'client_uuid' => (string) Str::uuid(),
                'lahan_id' => $lahan->id,
                'tipe' => 'semai',
                'tanggal' => '2026-06-01',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipe', 'semai');
    }

    public function test_pindah_tanam_mengubah_status_lahan_jadi_aktif(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id, 'status' => 'semai']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/aktivitas', [
                'client_uuid' => (string) Str::uuid(),
                'lahan_id' => $lahan->id,
                'tipe' => 'pindah_tanam',
                'tanggal' => '2026-06-02',
            ])
            ->assertCreated();

        $this->assertSame('aktif', $lahan->fresh()->status);
    }

    public function test_pemupukan_tanpa_jenis_pupuk_ditolak(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/aktivitas', [
                'client_uuid' => (string) Str::uuid(),
                'lahan_id' => $lahan->id,
                'tipe' => 'pemupukan',
                'tanggal' => '2026-06-03',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('jenis_pupuk');
    }

    public function test_catat_pestisida_multi(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/aktivitas', [
                'client_uuid' => (string) Str::uuid(),
                'lahan_id' => $lahan->id,
                'tipe' => 'pestisida',
                'tanggal' => '2026-06-04',
                'jenis_pestisida' => 'Antracol, Curacron',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipe', 'pestisida')
            ->assertJsonPath('data.jenis_pestisida', 'Antracol, Curacron');
    }

    public function test_pestisida_tanpa_jenis_pestisida_ditolak(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/aktivitas', [
                'client_uuid' => (string) Str::uuid(),
                'lahan_id' => $lahan->id,
                'tipe' => 'pestisida',
                'tanggal' => '2026-06-04',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('jenis_pestisida');
    }

    public function test_pemupukan_multi_jenis(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/aktivitas', [
                'client_uuid' => (string) Str::uuid(),
                'lahan_id' => $lahan->id,
                'tipe' => 'pemupukan',
                'tanggal' => '2026-06-05',
                'jenis_pupuk' => 'MKP, Ultradap, Boron',
            ])
            ->assertCreated()
            ->assertJsonPath('data.jenis_pupuk', 'MKP, Ultradap, Boron');
    }

    public function test_lahan_milik_user_lain_ditolak(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();
        $lahanLain = Lahan::factory()->create(['user_id' => $lain->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/aktivitas', [
                'client_uuid' => (string) Str::uuid(),
                'lahan_id' => $lahanLain->id,
                'tipe' => 'semai',
                'tanggal' => '2026-06-01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('lahan_id');
    }

    public function test_idempoten(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);
        $payload = [
            'client_uuid' => (string) Str::uuid(),
            'lahan_id' => $lahan->id,
            'tipe' => 'semai',
            'tanggal' => '2026-06-01',
        ];

        $this->actingAs($user, 'sanctum')->postJson('/api/aktivitas', $payload)->assertCreated();
        $this->actingAs($user, 'sanctum')->postJson('/api/aktivitas', $payload)->assertOk();

        $this->assertSame(1, Aktivitas::where('user_id', $user->id)->count());
    }

    public function test_index_terurut_terbaru_dengan_lahan(): void
    {
        $user = User::factory()->create();
        $lahan = Lahan::factory()->create(['user_id' => $user->id]);
        Aktivitas::factory()->create(['user_id' => $user->id, 'lahan_id' => $lahan->id, 'tanggal' => '2026-01-01']);
        Aktivitas::factory()->create(['user_id' => $user->id, 'lahan_id' => $lahan->id, 'tanggal' => '2026-05-01']);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/aktivitas')->assertOk();
        $tanggal = array_column($response->json('data'), 'tanggal');

        $this->assertSame(['2026-05-01', '2026-01-01'], $tanggal);
        $response->assertJsonStructure(['data' => [['lahan' => ['id', 'nomor_bed']]]]);
    }
}
