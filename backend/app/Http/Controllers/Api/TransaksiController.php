<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransaksiRequest;
use App\Http\Resources\TransaksiResource;
use App\Models\Transaksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransaksiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $transaksi = $request->user()->transaksi()
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get();

        $totalKeluar = $request->user()->transaksi()
            ->where('tipe', 'kas_keluar')
            ->sum('nominal');

        $totalMasuk = $request->user()->transaksi()
            ->where('tipe', 'kas_masuk')
            ->sum('nominal');

        return response()->json([
            'data' => TransaksiResource::collection($transaksi),
            'meta' => [
                'total_kas_keluar' => number_format((float) $totalKeluar, 2, '.', ''),
                'total_kas_masuk' => number_format((float) $totalMasuk, 2, '.', ''),
                'saldo' => number_format((float) $totalMasuk - (float) $totalKeluar, 2, '.', ''),
            ],
        ]);
    }

    public function store(TransaksiRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $clientUuid = (string) $request->string('client_uuid');

        $existing = Transaksi::where('user_id', $userId)
            ->where('client_uuid', $clientUuid)
            ->first();

        // Idempotensi sync.
        if ($existing) {
            return (new TransaksiResource($existing))->response()->setStatusCode(200);
        }

        $transaksi = Transaksi::create([
            'user_id' => $userId,
            'client_uuid' => $clientUuid,
            'tipe' => $request->input('tipe', 'kas_keluar'),
            'kategori' => $request->string('kategori'),
            'komoditas' => $request->input('komoditas'),
            'nominal' => $request->input('nominal'),
            'tanggal' => $request->date('tanggal'),
            'lahan_id' => $request->input('lahan_id'),
            'catatan' => $request->input('catatan'),
        ]);

        return (new TransaksiResource($transaksi))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Transaksi $transaksi): JsonResponse
    {
        abort_unless($transaksi->user_id === $request->user()->id, 404);

        $transaksi->delete();

        return response()->json(null, 204);
    }

    public function ringkasanKomoditas(Request $request): JsonResponse
    {
        $data = $request->user()->transaksi()
            ->where('tipe', 'kas_masuk')
            ->whereNotNull('komoditas')
            ->selectRaw('komoditas, SUM(nominal) as total, COUNT(*) as jumlah_transaksi')
            ->groupBy('komoditas')
            ->orderByDesc('total')
            ->get();

        return response()->json(['data' => $data]);
    }
}
