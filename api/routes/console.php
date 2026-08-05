<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Tontine automated alerts — see App\Services\TontineNotificationService. Both commands are
// idempotent (deduped via the `notifications` log), so running them more than once a day is
// harmless if ever needed; daily is enough since cycles are calendar week/month aligned.
Schedule::command('tontines:send-reminders')->dailyAt('09:00');
Schedule::command('tontines:generate-reports')->dailyAt('09:15');

// A 48h voting window doesn't need to-the-minute precision — hourly is enough to resolve a
// deletion request shortly after it expires without polling too aggressively.
Schedule::command('tontines:resolve-deletion-requests')->hourly();

// Actively resolves deposits/withdrawals/contributions stuck `processing` (webhook never
// arrived) — every 15 minutes matches the command's own REFRESH_AFTER_MINUTES grace window, so a
// stuck row gets its first reconciliation attempt as soon as it's eligible.
Schedule::command('payments:reconcile-pending')->everyFifteenMinutes();
