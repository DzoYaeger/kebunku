<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CarePlan extends Model
{
    protected $fillable = [
        'user_id',
        'lahan_id',
        'schedule',
        'summary',
        'status',
        'completed_items',
    ];

    protected function casts(): array
    {
        return [
            'schedule' => 'array',
            'completed_items' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lahan(): BelongsTo
    {
        return $this->belongsTo(Lahan::class);
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(PlantFeedback::class);
    }
}
