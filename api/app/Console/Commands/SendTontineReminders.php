<?php

namespace App\Console\Commands;

use App\Models\Group;
use App\Services\TontineNotificationService;
use Illuminate\Console\Command;

class SendTontineReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tontines:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Envoie les rappels de cotisation et les alertes de retard pour chaque tontine.';

    public function handle(TontineNotificationService $notifications): int
    {
        $reminders = 0;
        $lateAlerts = 0;

        Group::with('members', 'owner')->chunkById(50, function ($groups) use (&$reminders, &$lateAlerts, $notifications) {
            foreach ($groups as $group) {
                $reminders += $notifications->sendReminders($group);
                $lateAlerts += $notifications->sendLateAlerts($group);
            }
        });

        $this->info("Rappels envoyés : {$reminders}. Alertes de retard : {$lateAlerts}.");

        return self::SUCCESS;
    }
}
