<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AktivitasRequest;
use App\Http\Resources\AktivitasResource;
use App\Models\Aktivitas;
use App\Models\Lahan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AktivitasController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $aktivitas = $request->user()->aktivitas()
            ->with('lahan')
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get();

        return AktivitasResource::collection($aktivitas);
    }

    public function store(AktivitasRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $clientUuid = (string) $request->string('client_uuid');

        $existing = Aktivitas::where('user_id', $userId)
            ->where('client_uuid', $clientUuid)
            ->first();

        // Idempotensi sync.
        if ($existing) {
            return (new AktivitasResource($existing->load('lahan')))
                ->response()->setStatusCode(200);
        }

        $aktivitas = DB::transaction(function () use ($request, $userId, $clientUuid) {
            $tipe = (string) $request->input('tipe');

            $aktivitas = Aktivitas::create([
                'user_id' => $userId,
                'lahan_id' => $request->integer('lahan_id'),
                'client_uuid' => $clientUuid,
                'tipe' => $tipe,
                'tanggal' => $request->date('tanggal'),
                'jenis_pupuk' => $request->input('jenis_pupuk'),
                'jenis_pestisida' => $request->input('jenis_pestisida'),
                'catatan' => $request->input('catatan'),
            ]);

            // Pindah tanam memperbarui status lahan menjadi 'aktif' (Req 3.2).
            if ($tipe === 'pindah_tanam') {
                Lahan::where('id', $aktivitas->lahan_id)
                    ->where('user_id', $userId)
                    ->update(['status' => 'aktif']);
            }

            return $aktivitas;
        });

        return (new AktivitasResource($aktivitas->load('lahan')))
            ->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Aktivitas $aktivita): JsonResponse
    {
        abort_unless($aktivita->user_id === $request->user()->id, 404);

        $aktivita->delete();

        return response()->json(null, 204);
    }
}
