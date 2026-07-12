<?php

namespace App\Models;

use Database\Factories\VaultFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'balance'])]
#[Hidden(['pin_hash'])]
class Vault extends Model
{
    /** @use HasFactory<VaultFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
            'pin_set_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(VaultMovement::class);
    }

    public function hasPinSet(): bool
    {
        return ! is_null($this->pin_hash);
    }
}
