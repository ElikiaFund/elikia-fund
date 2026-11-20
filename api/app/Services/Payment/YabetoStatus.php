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
    /**
     * 'completed' is ours, not Yabeto's: the simulated (Yabeto disabled) path and tontine payouts
     * record it. It's final too — left out, a past simulated movement counted as "in flight" and
     * blocked every real deposit/withdrawal once Yabeto was switched on.
     */
    public const TERMINAL = ['succeeded', 'completed', 'failed', 'expired', 'canceled'];

    /** Final outcomes where the money did NOT move — a reserved withdrawal is refunded on any of them. */
    public const FAILURES = ['failed', 'expired', 'canceled'];

    /**
     * Ours, not Yabeto's: a withdrawal Yabeto couldn't confirm either way within the reconcile
     * window. Deliberately NOT terminal — a late webhook or lookup can still settle it on its own
     * — but it no longer counts as "in flight", so it doesn't block the merchant's next withdrawal.
     * Its money stays reserved until a real outcome arrives or support settles it.
     */
    public const NEEDS_REVIEW = 'needs_review';

    /** Statuses that no longer block a new attempt: final outcomes plus NEEDS_REVIEW. */
    public const NOT_IN_FLIGHT = [...self::TERMINAL, self::NEEDS_REVIEW];

    public static function isTerminal(string $status): bool
    {
        return in_array($status, self::TERMINAL, true);
    }

    public static function isPending(string $status): bool
    {
        return ! self::isTerminal($status);
    }
}
