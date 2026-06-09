<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PanenRequest;
use App\Http\Resources\PanenResource;
use App\Models\Panen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PanenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $panen = $request->user()->panen()
            ->with('lahan')
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get();

        $totalBerat = $panen->sum(fn ($p) => (float) $p->berat);
        $totalPendapatan = $panen->sum(
            fn ($p) => $p->harga_jual !== null ? (float) $p->harga_jual * (float) $p->berat : 0
        );

        return response()->json([
            'data' => PanenResource::collection($panen),
            'meta' => [
                'total_panen' => $panen->count(),
                'total_berat' => number_format($totalBerat, 2, '.', ''),
                'total_pendapatan' => number_format($totalPendapatan, 2, '.', ''),
            ],
        ]);
    }

    public function store(PanenRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $clientUuid = (string) $request->string('client_uuid');

        $existing = Panen::where('user_id', $userId)
            ->where('client_uuid', $clientUuid)
            ->first();

        if ($existing) {
            return (new PanenResource($existing->load('lahan')))->response()->setStatusCode(200);
        }

        $panen = Panen::create([
            'user_id' => $userId,
            'client_uuid' => $clientUuid,
            'lahan_id' => $request->input('lahan_id'),
            'tanggal' => $request->date('tanggal'),
            'berat' => $request->input('berat'),
            'grade' => $request->input('grade'),
            'harga_jual' => $request->input('harga_jual'),
            'pembeli' => $request->input('pembeli'),
            'catatan' => $request->input('catatan'),
        ]);

        return (new PanenResource($panen->load('lahan')))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Panen $panen): JsonResponse
    {
        abort_unless($panen->user_id === $request->user()->id, 404);

        $panen->delete();

        return response()->json(null, 204);
    }

    /**
     * Ringkasan profit per komoditas (pendapatan panen - biaya transaksi kas_keluar komoditas yang sama).
     */
    public function profitKomoditas(Request $request): JsonResponse
    {
        $user = $request->user();

        // Ambil total panen per komoditas (via lahan.komoditas)
        $panenList = $user->panen()->with('lahan')->get();

        $pendapatanMap = [];
        $beratMap = [];
        foreach ($panenList as $p) {
            $komoditas = $p->lahan?->komoditas ?? 'Tidak diketahui';
            $pendapatanMap[$komoditas] = ($pendapatanMap[$komoditas] ?? 0)
                + ($p->harga_jual !== null ? (float) $p->harga_jual * (float) $p->berat : 0);
            $beratMap[$komoditas] = ($beratMap[$komoditas] ?? 0) + (float) $p->berat;
        }

        // Ambil total pengeluaran per komoditas (dari transaksi kas_keluar dengan komoditas terisi)
        $biayaList = $user->transaksi()
            ->where('tipe', 'kas_keluar')
            ->whereNotNull('komoditas')
            ->selectRaw('komoditas, SUM(nominal) as total_biaya')
            ->groupBy('komoditas')
            ->get()
            ->keyBy('komoditas');

        $result = [];
        foreach ($pendapatanMap as $komoditas => $pendapatan) {
            $biaya = (float) ($biayaList[$komoditas]?->total_biaya ?? 0);
            $result[] = [
                'komoditas' => $komoditas,
                'total_berat' => round($beratMap[$komoditas] ?? 0, 2),
                'total_pendapatan' => round($pendapatan, 2),
                'total_biaya' => round($biaya, 2),
                'profit' => round($pendapatan - $biaya, 2),
                'margin' => $pendapatan > 0
                    ? round(($pendapatan - $biaya) / $pendapatan * 100, 2)
                    : 0,
            ];
        }

        // Urutkan by profit tertinggi
        usort($result, fn ($a, $b) => $b['profit'] <=> $a['profit']);

        return response()->json(['data' => $result]);
    }
}
