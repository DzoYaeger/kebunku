<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PupukInventory extends Model
{
    protected $table = 'pupuk_inventory';

    protected $fillable = [
        'user_id',
        'nama',
        'tipe',
        'satuan',
        'stok',
        'catatan',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
