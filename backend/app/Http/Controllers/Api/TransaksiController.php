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

        // Saldo MVP: 0 dikurangi total kas keluar (Req 4: agregasi, tidak disimpan).
        $totalKeluar = $request->user()->transaksi()
            ->where('tipe', 'kas_keluar')
            ->sum('nominal');

        return response()->json([
            'data' => TransaksiResource::collection($transaksi),
            'meta' => [
                'total_kas_keluar' => number_format((float) $totalKeluar, 2, '.', ''),
                'saldo' => number_format(0 - (float) $totalKeluar, 2, '.', ''),
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
}
