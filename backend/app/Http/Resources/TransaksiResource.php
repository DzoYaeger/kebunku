<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Transaksi
 */
class TransaksiResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_uuid' => $this->client_uuid,
            'tipe' => $this->tipe,
            'kategori' => $this->kategori,
            'nominal' => (string) $this->nominal,
            'tanggal' => $this->tanggal?->toDateString(),
            'lahan_id' => $this->lahan_id,
            'catatan' => $this->catatan,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
