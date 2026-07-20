<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

/**
 * Single-row admin-managed Yabeto Pay configuration (see api/app/Services/Payment). `secret_key`
 * and `webhook_secret` use Laravel's `encrypted` cast (APP_KEY-based) — at rest they're never
 * plaintext, and `#[Hidden]` keeps them out of JSON even if a future `to_array()` call forgets to
 * exclude them explicitly. Read through `Admin\YabetoSettingController`, never returned raw.
 */
#[Fillable(['mode', 'account_id', 'secret_key', 'webhook_secret', 'is_enabled'])]
#[Hidden(['secret_key', 'webhook_secret'])]
class YabetoSetting extends Model
{
    protected function casts(): array
    {
        return [
            'secret_key' => 'encrypted',
            'webhook_secret' => 'encrypted',
            'is_enabled' => 'boolean',
        ];
    }

    /**
     * There is only ever one row — admins manage a single active Yabeto configuration, not a
     * list of them (same "keep it dumb" scope as everything else payment-related right now).
     */
    public static function current(): self
    {
        return static::firstOrCreate([], ['mode' => 'sandbox', 'is_enabled' => false]);
    }
}
