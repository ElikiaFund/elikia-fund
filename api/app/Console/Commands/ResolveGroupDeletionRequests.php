<?php

namespace App\Console\Commands;

use App\Models\GroupDeletionRequest;
use App\Services\GroupDeletionService;
use Illuminate\Console\Command;

class ResolveGroupDeletionRequests extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tontines:resolve-deletion-requests';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Résout les demandes de suppression de tontine dont la fenêtre de 48h est écoulée — silence vaut approbation.';

    public function handle(GroupDeletionService $deletions): int
    {
        $resolved = 0;

        GroupDeletionRequest::where('status', 'pending')
            ->where('expires_at', '<=', now())
            ->each(function (GroupDeletionRequest $deletionRequest) use ($deletions, &$resolved) {
                if ($deletions->resolveExpiredAndNotify($deletionRequest) !== null) {
                    $resolved++;
                }
            });

        $this->info("Demandes de suppression résolues : {$resolved}.");

        return self::SUCCESS;
    }
}
