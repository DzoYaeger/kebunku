<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_valid_membuat_akun_dan_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Pak Tani',
            'email' => 'tani@example.com',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['data' => ['user' => ['id', 'name', 'email'], 'token']]);
        $this->assertDatabaseHas('users', ['email' => 'tani@example.com']);
    }

    public function test_register_email_duplikat_ditolak(): void
    {
        User::factory()->create(['email' => 'dupe@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Lain',
            'email' => 'dupe@example.com',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame(1, User::where('email', 'dupe@example.com')->count());
    }

    public function test_login_kredensial_benar(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('rahasia123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@example.com',
            'password' => 'rahasia123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['user' => ['id', 'email'], 'token']]);
    }

    public function test_login_kredensial_salah_401(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('rahasia123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@example.com',
            'password' => 'salah',
        ]);

        $response->assertStatus(401);
    }

    public function test_endpoint_terproteksi_tanpa_token_401(): void
    {
        $this->getJson('/api/lahan')->assertStatus(401);
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_me_mengembalikan_profil(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_logout_mencabut_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->assertSame(1, $user->tokens()->count());

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        // Token aktif dicabut dari penyimpanan sehingga tidak dapat dipakai lagi (Req 1.6).
        $this->assertSame(0, $user->fresh()->tokens()->count());
    }
}
