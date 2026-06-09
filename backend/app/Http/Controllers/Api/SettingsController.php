<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PupukInventory;
use App\Models\UserSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    // GET /api/settings — ambil settings user
    public function show(Request $request): JsonResponse
    {
        $settings = UserSetting::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['takaran_pupuk' => 'ember 25L', 'takaran_pestisida' => 'tangki 14L'],
        );

        return response()->json(['data' => $settings]);
    }

    // PUT /api/settings — update settings
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'takaran_pupuk' => 'sometimes|string|max:100',
            'takaran_pestisida' => 'sometimes|string|max:100',
            'takaran_benam' => 'sometimes|string|max:100',
            'luas_lahan' => 'nullable|numeric|min:0',
        ]);

        $settings = UserSetting::updateOrCreate(
            ['user_id' => $request->user()->id],
            $request->only(['takaran_pupuk', 'takaran_pestisida', 'takaran_benam', 'luas_lahan']),
        );

        return response()->json(['data' => $settings]);
    }

    // GET /api/pupuk-inventory — list pupuk/pestisida user
    public function inventoryIndex(Request $request): JsonResponse
    {
        $items = PupukInventory::where('user_id', $request->user()->id)
            ->orderBy('tipe')
            ->orderBy('nama')
            ->get();

        return response()->json(['data' => $items]);
    }

    // POST /api/pupuk-inventory — tambah item
    public function inventoryStore(Request $request): JsonResponse
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'tipe' => 'required|in:pupuk,pestisida',
            'satuan' => 'nullable|string|max:50',
            'stok' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string|max:500',
        ]);

        $item = PupukInventory::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'nama' => $request->nama,
                'tipe' => $request->tipe,
            ],
            $request->only(['satuan', 'stok', 'catatan']),
        );

        return response()->json(['data' => $item], 201);
    }

    // PUT /api/pupuk-inventory/{id} — update item
    public function inventoryUpdate(Request $request, PupukInventory $pupukInventory): JsonResponse
    {
        abort_if($pupukInventory->user_id !== $request->user()->id, 404);

        $request->validate([
            'nama' => 'sometimes|string|max:255',
            'satuan' => 'nullable|string|max:50',
            'stok' => 'nullable|numeric|min:0',
            'catatan' => 'nullable|string|max:500',
        ]);

        $pupukInventory->update($request->only(['nama', 'satuan', 'stok', 'catatan']));

        return response()->json(['data' => $pupukInventory]);
    }

    // DELETE /api/pupuk-inventory/{id}
    public function inventoryDestroy(Request $request, PupukInventory $pupukInventory): JsonResponse
    {
        abort_if($pupukInventory->user_id !== $request->user()->id, 404);
        $pupukInventory->delete();

        return response()->json(null, 204);
    }
}
