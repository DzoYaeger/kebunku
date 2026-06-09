<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'team_owner_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * @return HasMany<\App\Models\Lahan, $this>
     */
    public function lahan(): HasMany
    {
        return $this->hasMany(Lahan::class);
    }

    /**
     * @return HasMany<\App\Models\Aktivitas, $this>
     */
    public function aktivitas(): HasMany
    {
        return $this->hasMany(Aktivitas::class);
    }

    /**
     * @return HasMany<\App\Models\Transaksi, $this>
     */
    public function transaksi(): HasMany
    {
        return $this->hasMany(Transaksi::class);
    }

    /**
     * @return HasMany<\App\Models\Panen, $this>
     */
    public function panen(): HasMany
    {
        return $this->hasMany(Panen::class);
    }

    /**
     * @return HasMany<\App\Models\MusimTanam, $this>
     */
    public function musimTanam(): HasMany
    {
        return $this->hasMany(MusimTanam::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function teamMembers(): HasMany
    {
        return $this->hasMany(User::class, 'team_owner_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function teamOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_owner_id');
    }
}
