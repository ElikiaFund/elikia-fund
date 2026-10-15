<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Append-only dedup record for Yabeto webhook deliveries. The handler INSERTs a row before
 * processing any event; a UNIQUE constraint violation on `event_id` means we've already seen
 * this delivery and must no-op (acknowledges with 200 to stop Yabeto's retries).
 */
#[Fillable(['event_id', 'event_type', 'received_at'])]
class YabetoWebhookEvent extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['received_at' => 'datetime'];
    }
}
