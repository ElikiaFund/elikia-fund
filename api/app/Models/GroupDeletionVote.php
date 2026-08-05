<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['group_deletion_request_id', 'user_id', 'decision', 'decided_at'])]
class GroupDeletionVote extends Model
{
    protected function casts(): array
    {
        return [
            'decided_at' => 'datetime',
        ];
    }

    public function deletionRequest(): BelongsTo
    {
        return $this->belongsTo(GroupDeletionRequest::class, 'group_deletion_request_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
