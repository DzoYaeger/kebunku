<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\MusimTanam
 */
class MusimTanamResource extends JsonResource
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
                'status' => $this->lahan?->status,
            ]),
            'komoditas' => $this->komoditas,
            'tanggal_mulai' => $this->tanggal_mulai?->format('Y-m-d'),
            'tanggal_selesai' => $this->tanggal_selesai?->format('Y-m-d'),
            'status' => $this->status,
            'catatan' => $this->catatan,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
