<?php

namespace App\Models;

use Database\Factories\VaultMovementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['vault_id', 'type', 'amount', 'fee_amount', 'provider_fee_amount', 'platform_fee_amount', 'net_amount', 'note', 'provider', 'status', 'yabeto_reference', 'phone', 'group_id', 'cycle_period', 'review_reason', 'reviewed_by_user_id', 'reviewed_at', 'review_note'])]
class VaultMovement extends Model
{
    /** @use HasFactory<VaultMovementFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'fee_amount' => 'decimal:2',
            'provider_fee_amount' => 'decimal:2',
            'platform_fee_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    public function vault(): BelongsTo
    {
        return $this->belongsTo(Vault::class);
    }

    /** The admin who settled a `needs_review` withdrawal. */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    /** Only set on a 'tontine_payout' movement — traces it back to the cycle that produced it. */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
