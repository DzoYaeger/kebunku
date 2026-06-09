<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lahan extends Model
{
    /** @use HasFactory<\Database\Factories\LahanFactory> */
    use HasFactory;

    protected $table = 'lahan';

    protected $fillable = [
        'user_id',
        'client_uuid',
        'nomor_bed',
        'komoditas',
        'icon',
        'status',
        'tanggal_tanam',
        'catatan',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Aktivitas, $this>
     */
    public function aktivitas(): HasMany
    {
        return $this->hasMany(Aktivitas::class);
    }

    /**
     * @return HasMany<Panen, $this>
     */
    public function panen(): HasMany
    {
        return $this->hasMany(Panen::class);
    }

    /**
     * @return HasMany<MusimTanam, $this>
     */
    public function musimTanam(): HasMany
    {
        return $this->hasMany(MusimTanam::class);
    }
}
