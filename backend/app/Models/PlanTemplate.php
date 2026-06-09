<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanTemplate extends Model
{
    protected $fillable = ['user_id', 'nama', 'komoditas', 'schedule', 'summary'];

    protected function casts(): array
    {
        return ['schedule' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
