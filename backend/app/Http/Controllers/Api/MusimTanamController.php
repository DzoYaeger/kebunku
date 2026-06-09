<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MusimTanamRequest;
use App\Http\Resources\MusimTanamResource;
use App\Models\Lahan;
use App\Models\MusimTanam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MusimTanamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $musim = $request->user()->musimTanam()
            ->with('lahan')
            ->orderByDesc('tanggal_mulai')
            ->get();

        return response()->json(['data' => MusimTanamResource::collection($musim)]);
    }

    public function store(MusimTanamRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $clientUuid = (string) $request->string('client_uuid');

        $existing = MusimTanam::where('user_id', $userId)
            ->where('client_uuid', $clientUuid)
            ->first();

        if ($existing) {
            return (new MusimTanamResource($existing->load('lahan')))->response()->setStatusCode(200);
        }

        $musim = MusimTanam::create([
            'user_id' => $userId,
            'client_uuid' => $clientUuid,
            'lahan_id' => $request->input('lahan_id'),
            'komoditas' => $request->string('komoditas'),
            'tanggal_mulai' => $request->date('tanggal_mulai'),
            'tanggal_selesai' => $request->date('tanggal_selesai'),
            'status' => $request->input('status', 'aktif'),
            'catatan' => $request->input('catatan'),
        ]);

        return (new MusimTanamResource($musim->load('lahan')))->response()->setStatusCode(201);
    }

    public function update(MusimTanamRequest $request, MusimTanam $musimTanam): JsonResponse
    {
        abort_unless($musimTanam->user_id === $request->user()->id, 404);

        $musimTanam->update($request->only([
            'komoditas',
            'tanggal_mulai',
            'tanggal_selesai',
            'status',
            'catatan',
        ]));

        // Saat musim selesai, perbarui status lahan jadi 'selesai' jika tidak ada musim aktif lain
        if ($musimTanam->status === 'selesai' || $musimTanam->status === 'gagal') {
            $lahanId = $musimTanam->lahan_id;
            $masihAktif = MusimTanam::where('lahan_id', $lahanId)
                ->where('status', 'aktif')
                ->exists();

            if (! $masihAktif) {
                Lahan::where('id', $lahanId)
                    ->where('user_id', $request->user()->id)
                    ->update(['status' => 'selesai']);
            }
        }

        return (new MusimTanamResource($musimTanam->fresh()->load('lahan')))->response()->setStatusCode(200);
    }

    public function destroy(Request $request, MusimTanam $musimTanam): JsonResponse
    {
        abort_unless($musimTanam->user_id === $request->user()->id, 404);

        $musimTanam->delete();

        return response()->json(null, 204);
    }
}
