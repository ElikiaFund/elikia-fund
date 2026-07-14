<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

// `key` is deliberately not fillable — the factor catalog is fixed/code-defined
// (see ScoringCriteriaSeeder), only weight/is_active/thresholds are admin-editable.
#[Fillable(['label', 'description', 'weight', 'is_active', 'thresholds'])]
class ScoringCriterion extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'thresholds' => 'array',
        ];
    }
}
