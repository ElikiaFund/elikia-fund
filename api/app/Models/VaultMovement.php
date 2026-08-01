<?php

namespace App\Models;

use Database\Factories\VaultMovementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['vault_id', 'type', 'amount', 'note', 'provider', 'status', 'yabeto_reference', 'group_id', 'cycle_period'])]
class VaultMovement extends Model
{
    /** @use HasFactory<VaultMovementFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function vault(): BelongsTo
    {
        return $this->belongsTo(Vault::class);
    }

    /** Only set on a 'tontine_payout' movement — traces it back to the cycle that produced it. */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
