<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin \App\Models\ChatMessage
 */
class ChatMessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'chat_session_id' => $this->chat_session_id,
            'role' => $this->role,
            'content' => $this->content,
            'image_url' => $this->image_path ? Storage::url($this->image_path) : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
