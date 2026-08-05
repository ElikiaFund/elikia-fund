<?php

namespace App\Models;

use Database\Factories\CashSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['uuid', 'company_id', 'period_start', 'closed_at', 'expected_balance', 'counted_balance', 'variance', 'notes'])]
class CashSession extends Model
{
    /** @use HasFactory<CashSessionFactory> */
    use HasFactory;

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

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
