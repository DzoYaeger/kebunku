<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LahanRequest;
use App\Http\Resources\LahanResource;
use App\Models\Lahan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LahanController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $lahan = $request->user()->lahan()
            ->latest()
            ->get();

        return LahanResource::collection($lahan);
    }

    public function store(LahanRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $clientUuid = (string) $request->string('client_uuid');

        $existing = Lahan::where('user_id', $userId)
            ->where('client_uuid', $clientUuid)
            ->first();

        // Idempotensi: replay sync dengan client_uuid sama -> kembalikan record yang ada.
        if ($existing) {
            return (new LahanResource($existing))->response()->setStatusCode(200);
        }

        $lahan = Lahan::create([
            'user_id' => $userId,
            'client_uuid' => $clientUuid,
            'nomor_bed' => $request->string('nomor_bed'),
            'komoditas' => $request->string('komoditas'),
            'status' => $request->input('status', 'semai'),
            'tanggal_tanam' => $request->input('tanggal_tanam'),
            'catatan' => $request->input('catatan'),
        ]);

        return (new LahanResource($lahan))->response()->setStatusCode(201);
    }

    public function show(Request $request, Lahan $lahan): LahanResource
    {
        $this->authorizeOwnership($request, $lahan);

        return new LahanResource($lahan);
    }

    public function update(LahanRequest $request, Lahan $lahan): LahanResource
    {
        $this->authorizeOwnership($request, $lahan);

        $lahan->update($request->only(['nomor_bed', 'komoditas', 'status', 'tanggal_tanam', 'catatan']));

        return new LahanResource($lahan);
    }

    public function destroy(Request $request, Lahan $lahan): JsonResponse
    {
        $this->authorizeOwnership($request, $lahan);

        $lahan->delete();

        return response()->json(null, 204);
    }

    private function authorizeOwnership(Request $request, Lahan $lahan): void
    {
        abort_unless($lahan->user_id === $request->user()->id, 404);
    }
}
