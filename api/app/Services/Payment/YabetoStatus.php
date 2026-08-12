<?php

namespace App\Services\Payment;

/**
 * Yabeto's documented "reliable" status subset is pending/processing/succeeded/failed
 * (yabeto.md §5) — but Stripe-derived extras (`requires_confirmation`) and even fully
 * undocumented strings (observed in production: `incomplete`) show up in practice. Rather than
 * maintain an allowlist of every transient status seen so far — guaranteed to miss the next one,
 * which is exactly how a stuck "processing"-only check silently stopped resolving contributions
 * once Yabeto started returning something else — terminality is defined by exclusion: only
 * succeeded/failed/expired/canceled (Yabeto's only genuinely final outcomes, mirrored from
 * PaymentIntentResult::succeeded()/failed()) count as resolved. Everything else — 'processing',
 * 'requires_confirmation', 'incomplete', or any future surprise — is "still not resolved yet",
 * and stays eligible for a manual refresh / the reconcile sweep / blocking a duplicate attempt.
 */
class YabetoStatus
{
    /** Public so callers can also build `whereNotIn('status', ...)` queries against it. */
    public const TERMINAL = ['succeeded', 'failed', 'expired', 'canceled'];

    public static function isTerminal(string $status): bool
    {
        return in_array($status, self::TERMINAL, true);
    }

    public static function isPending(string $status): bool
    {
        return ! self::isTerminal($status);
    }
}
