<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Panen
 */
class PanenResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_uuid' => $this->client_uuid,
            'lahan_id' => $this->lahan_id,
            'lahan' => $this->whenLoaded('lahan', fn () => [
                'id' => $this->lahan?->id,
                'nomor_bed' => $this->lahan?->nomor_bed,
                'komoditas' => $this->lahan?->komoditas,
                'icon' => $this->lahan?->icon,
            ]),
            'tanggal' => $this->tanggal?->format('Y-m-d'),
            'berat' => number_format((float) $this->berat, 2, '.', ''),
            'grade' => $this->grade,
            'harga_jual' => $this->harga_jual !== null ? number_format((float) $this->harga_jual, 2, '.', '') : null,
            'total' => $this->harga_jual !== null ? number_format((float) $this->harga_jual * (float) $this->berat, 2, '.', '') : null,
            'pembeli' => $this->pembeli,
            'catatan' => $this->catatan,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
