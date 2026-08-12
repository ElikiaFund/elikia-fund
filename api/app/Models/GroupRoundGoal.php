<?php

namespace App\Models;

use Database\Factories\GroupRoundGoalFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['group_id', 'round_number', 'goal_text', 'target_amount'])]
class GroupRoundGoal extends Model
{
    /** @use HasFactory<GroupRoundGoalFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
