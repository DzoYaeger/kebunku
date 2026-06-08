<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ChatSession
 */
class ChatSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'judul' => $this->judul,
            'lahan_id' => $this->lahan_id,
            'lahan' => $this->whenLoaded('lahan', fn () => $this->lahan ? [
                'id' => $this->lahan->id,
                'nomor_bed' => $this->lahan->nomor_bed,
                'komoditas' => $this->lahan->komoditas,
            ] : null),
            'messages' => ChatMessageResource::collection($this->whenLoaded('messages')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
