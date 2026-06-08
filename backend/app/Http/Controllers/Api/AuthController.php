<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name'),
            'username' => $request->filled('username') ? (string) $request->string('username') : null,
            'email' => $request->string('email'),
            'password' => $request->string('password'),
        ]);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        // Field 'login' bisa berisi email ATAU username.
        $loginValue = (string) $request->string('login');
        $field = filter_var($loginValue, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $user = User::where($field, $loginValue)->first();

        // Pesan generik agar tidak membocorkan field mana yang salah (Req 1.4).
        if (! $user || ! Hash::check((string) $request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'login' => [__('auth.failed')],
            ])->status(401);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update([
            'name' => $request->string('name'),
            'username' => $request->filled('username') ? (string) $request->string('username') : null,
            'email' => $request->string('email'),
        ]);

        return response()->json([
            'data' => new UserResource($user->fresh()),
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check((string) $request->string('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password saat ini salah.'],
            ]);
        }

        $user->update([
            'password' => $request->string('password'),
        ]);

        return response()->json([
            'message' => 'Password berhasil diperbarui.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Cabut token aktif yang dipakai untuk request ini.
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out.',
        ]);
    }
}
