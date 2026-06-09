<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlantFeedback extends Model
{
    protected $table = 'plant_feedback';

    protected $fillable = [
        'user_id',
        'lahan_id',
        'care_plan_id',
        'tipe',
        'content',
        'ai_response',
        'image_path',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lahan(): BelongsTo
    {
        return $this->belongsTo(Lahan::class);
    }

    public function carePlan(): BelongsTo
    {
        return $this->belongsTo(CarePlan::class);
    }
}
