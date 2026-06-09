<?php

use App\Http\Controllers\Api\AktivitasController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CuacaController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\LahanController;
use App\Http\Controllers\Api\MusimTanamController;
use App\Http\Controllers\Api\PanenController;
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
    Route::put('/transaksi/{transaksi}', [TransaksiController::class, 'update']);
    Route::delete('/transaksi/{transaksi}', [TransaksiController::class, 'destroy']);

    // Panen
    Route::get('/panen', [PanenController::class, 'index']);
    Route::get('/panen/profit-komoditas', [PanenController::class, 'profitKomoditas']);
    Route::post('/panen', [PanenController::class, 'store']);
    Route::delete('/panen/{panen}', [PanenController::class, 'destroy']);

    // Musim Tanam
    Route::get('/musim-tanam', [MusimTanamController::class, 'index']);
    Route::post('/musim-tanam', [MusimTanamController::class, 'store']);
    Route::put('/musim-tanam/{musimTanam}', [MusimTanamController::class, 'update']);
    Route::delete('/musim-tanam/{musimTanam}', [MusimTanamController::class, 'destroy']);

    // Dashboard & Analytics
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Export CSV
    Route::get('/export/transaksi', [ExportController::class, 'exportTransaksi']);
    Route::get('/export/panen', [ExportController::class, 'exportPanen']);

    // Perawatan
    Route::get('/perawatan', [PerawatanController::class, 'index']);
    Route::post('/perawatan/saran-ai', [PerawatanController::class, 'saranAi']);
    Route::post('/perawatan/keluhan', [PerawatanController::class, 'keluhan']);
    Route::get('/perawatan/saran-ai/{lahan}', [PerawatanController::class, 'riwayatSaran']);

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
