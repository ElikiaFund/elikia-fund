<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['group_id', 'requested_by', 'status', 'expires_at', 'resolved_at'])]
class GroupDeletionRequest extends Model
{
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Named `requester`, not `requestedBy` — a `requestedBy()` relation would serialize to the
     * JSON key `requested_by`, colliding with (and silently overwriting) the plain integer FK
     * column of the same name in Model::toArray()'s attributes+relations merge.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function votes(): HasMany
    {
        return $this->hasMany(GroupDeletionVote::class);
    }
}
