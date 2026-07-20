<?php

namespace App\Console\Commands;

use App\Models\Group;
use App\Services\TontineNotificationService;
use Illuminate\Console\Command;

class GenerateTontineReports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tontines:generate-reports';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = "Notifie les créateurs de tontine qu'un rapport de cycle est disponible.";

    public function handle(TontineNotificationService $notifications): int
    {
        $sent = 0;

        Group::with('owner')->chunkById(50, function ($groups) use (&$sent, $notifications) {
            foreach ($groups as $group) {
                if ($notifications->sendCycleReportNotification($group)) {
                    $sent++;
                }
            }
        });

        $this->info("Rapports envoyés : {$sent}.");

        return self::SUCCESS;
    }
}
