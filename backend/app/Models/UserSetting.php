<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSetting extends Model
{
    protected $fillable = [
        'user_id',
        'takaran_pupuk',
        'takaran_pestisida',
        'takaran_benam',
        'luas_lahan',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
