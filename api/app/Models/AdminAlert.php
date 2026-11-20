<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['type', 'title', 'body', 'data', 'vault_movement_id', 'acknowledged_at', 'acknowledged_by_user_id'])]
class AdminAlert extends Model
{
    public const WITHDRAWAL_NEEDS_REVIEW = 'withdrawal_needs_review';

    public const CONNECT_REFUND_BLOCKED = 'connect_refund_blocked';

    public const CONNECT_REVERSAL_BLOCKED = 'connect_reversal_blocked';

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function vaultMovement(): BelongsTo
    {
        return $this->belongsTo(VaultMovement::class);
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by_user_id');
    }
}
