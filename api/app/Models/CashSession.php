<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['uuid', 'user_id', 'period_start', 'closed_at', 'expected_balance', 'counted_balance', 'variance', 'notes'])]
class CashSession extends Model
{
    protected function casts(): array
    {
        return [
            'period_start' => 'datetime',
            'closed_at' => 'datetime',
            'expected_balance' => 'decimal:2',
            'counted_balance' => 'decimal:2',
            'variance' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
