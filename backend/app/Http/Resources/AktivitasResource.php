<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Aktivitas
 */
class AktivitasResource extends JsonResource
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
            'tipe' => $this->tipe,
            'tanggal' => $this->tanggal?->toDateString(),
            'jenis_pupuk' => $this->jenis_pupuk,
            'jenis_pestisida' => $this->jenis_pestisida,
            'catatan' => $this->catatan,
            'lahan' => new LahanResource($this->whenLoaded('lahan')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
