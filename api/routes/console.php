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
