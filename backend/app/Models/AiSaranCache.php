<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiSaranCache extends Model
{
    protected $table = 'ai_saran_cache';

    protected $fillable = [
        'user_id',
        'lahan_id',
        'tipe',
        'saran',
        'hash_key',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lahan(): BelongsTo
    {
        return $this->belongsTo(Lahan::class);
    }
}
