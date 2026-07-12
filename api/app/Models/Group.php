<?php

namespace App\Models;

use Database\Factories\GroupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['uuid', 'name', 'contribution_amount', 'frequency', 'invite_code', 'owner_id'])]
class Group extends Model
{
    /** @use HasFactory<GroupFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'contribution_amount' => 'decimal:2',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members')->withPivot('joined_at');
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class);
    }
}
