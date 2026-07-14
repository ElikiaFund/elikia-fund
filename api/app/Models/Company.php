<?php

namespace App\Models;

use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'name', 'category', 'other_category'])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory;

    public const CATEGORIES = [
        'commerce',
        'agriculture',
        'artisanat',
        'restauration',
        'transport',
        'services',
        'beaute_bien_etre',
        'sante',
        'education',
        'technologie',
        'autre',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
