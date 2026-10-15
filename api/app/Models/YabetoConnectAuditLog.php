<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only — the only writes are CompanyConnectService::audit(). No `updated_at` on the
 * table on purpose: audit rows reflect what happened at a point in time and shouldn't be
 * editable after the fact.
 */
#[Fillable(['company_id', 'actor_user_id', 'action', 'source', 'result', 'reason', 'payload', 'created_at'])]
class YabetoConnectAuditLog extends Model
{
    public $timestamps = false;

    protected $table = 'yabeto_connect_audit_log';

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
