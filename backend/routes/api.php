<?php

use App\Http\Controllers\Api\AktivitasController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LahanController;
use App\Http\Controllers\Api\TransaksiController;
use Illuminate\Support\Facades\Route;

// --- Publik (penerbitan token) ---
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// --- Terproteksi (auth:sanctum) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
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

    // Transaksi (Kas Keluar)
    Route::get('/transaksi', [TransaksiController::class, 'index']);
    Route::post('/transaksi', [TransaksiController::class, 'store']);
    Route::delete('/transaksi/{transaksi}', [TransaksiController::class, 'destroy']);
});
