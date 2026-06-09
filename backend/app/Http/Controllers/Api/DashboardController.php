<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();

        // 1. Total Lahan Aktif
        $lahanAktifCount = $user->lahan()->whereIn('status', ['semai', 'aktif'])->count();

        // 2. Komoditas Terbanyak (dari lahan yang tidak selesai)
        $komoditasTerbanyak = $user->lahan()
            ->whereIn('status', ['semai', 'aktif'])
            ->selectRaw('komoditas, COUNT(*) as jumlah')
            ->groupBy('komoditas')
            ->orderByDesc('jumlah')
            ->first();

        // 3. Biaya Bulan Ini (kas_keluar)
        $biayaBulanIni = $user->transaksi()
            ->where('tipe', 'kas_keluar')
            ->whereBetween('tanggal', [$startOfMonth, $now])
            ->sum('nominal');

        // 4. Pendapatan Panen Bulan Ini
        $panenBulanIni = $user->panen()
            ->whereBetween('tanggal', [$startOfMonth, $now])
            ->get();

        $pendapatanBulanIni = $panenBulanIni->sum(
            fn ($p) => $p->harga_jual !== null ? (float) $p->harga_jual * (float) $p->berat : 0
        );

        $beratBulanIni = $panenBulanIni->sum(fn ($p) => (float) $p->berat);

        // 5. Total Pendapatan & Biaya Keseluruhan (untuk estimasi laba total)
        $semuaBiaya = $user->transaksi()->where('tipe', 'kas_keluar')->sum('nominal');

        $semuaPanen = $user->panen()->get();
        $semuaPendapatan = $semuaPanen->sum(
            fn ($p) => $p->harga_jual !== null ? (float) $p->harga_jual * (float) $p->berat : 0
        );

        return response()->json([
            'data' => [
                'lahan_aktif' => $lahanAktifCount,
                'top_komoditas' => $komoditasTerbanyak ? $komoditasTerbanyak->komoditas : null,
                'top_komoditas_count' => $komoditasTerbanyak ? $komoditasTerbanyak->jumlah : 0,
                'biaya_bulan_ini' => round((float) $biayaBulanIni, 2),
                'pendapatan_bulan_ini' => round($pendapatanBulanIni, 2),
                'berat_panen_bulan_ini' => round($beratBulanIni, 2),
                'laba_total_estimasi' => round($semuaPendapatan - (float) $semuaBiaya, 2),
            ]
        ]);
    }
}
