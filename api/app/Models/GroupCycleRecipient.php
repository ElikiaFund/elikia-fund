<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['group_id', 'cycle_period', 'user_id', 'method', 'decided_at', 'paid_out_at', 'vault_movement_id', 'round_number'])]
class GroupCycleRecipient extends Model
{
    protected function casts(): array
    {
        return [
            'decided_at' => 'datetime',
            'paid_out_at' => 'datetime',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vaultMovement(): BelongsTo
    {
        return $this->belongsTo(VaultMovement::class);
    }
}
