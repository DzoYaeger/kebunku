<?php

use App\Http\Controllers\Api\AktivitasController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CuacaController;
use App\Http\Controllers\Api\LahanController;
use App\Http\Controllers\Api\PerawatanController;
use App\Http\Controllers\Api\TransaksiController;
use Illuminate\Support\Facades\Route;

// --- Publik (penerbitan token) ---
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// --- Terproteksi (auth:sanctum) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Lahan
    Route::get('/lahan', [LahanController::class, 'index']);
    Route::post('/lahan', [LahanController::class, 'store']);
    Route::get('/lahan/{lahan}', [LahanController::class, 'show']);
    Route::put('/lahan/{lahan}', [LahanController::class, 'update']);
    Route::delete('/lahan/{lahan}', [LahanController::class, 'destroy']);

    // Aktivitas
    Route::get('/aktivitas', [AktivitasController::class, 'index']);
    Route::post('/aktivitas', [AktivitasController::class, 'store']);
    Route::delete('/aktivitas/{aktivita}', [AktivitasController::class, 'destroy']);

    // Transaksi (Kas Keluar & Kas Masuk)
    Route::get('/transaksi', [TransaksiController::class, 'index']);
    Route::get('/transaksi/ringkasan-komoditas', [TransaksiController::class, 'ringkasanKomoditas']);
    Route::post('/transaksi', [TransaksiController::class, 'store']);
    Route::delete('/transaksi/{transaksi}', [TransaksiController::class, 'destroy']);

    // Perawatan
    Route::get('/perawatan', [PerawatanController::class, 'index']);
    Route::post('/perawatan/saran-ai', [PerawatanController::class, 'saranAi']);

    // Cuaca & Saran Harian
    Route::get('/cuaca', [CuacaController::class, 'index']);
    Route::get('/saran-harian', [CuacaController::class, 'saranHarian']);

    // Chat AI
    Route::get('/chat/sessions', [ChatController::class, 'index']);
    Route::post('/chat/sessions', [ChatController::class, 'store']);
    Route::get('/chat/sessions/{chatSession}', [ChatController::class, 'show']);
    Route::delete('/chat/sessions/{chatSession}', [ChatController::class, 'destroy']);
    Route::post('/chat/sessions/{chatSession}/messages', [ChatController::class, 'sendMessage']);
});
