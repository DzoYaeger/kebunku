<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Aktivitas extends Model
{
    /** @use HasFactory<\Database\Factories\AktivitasFactory> */
    use HasFactory;

    protected $table = 'aktivitas';

    protected $fillable = [
        'user_id',
        'lahan_id',
        'client_uuid',
        'tipe',
        'tanggal',
        'jenis_pupuk',
        'jenis_pestisida',
        'catatan',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Lahan, $this>
     */
    public function lahan(): BelongsTo
    {
        return $this->belongsTo(Lahan::class);
    }
}
