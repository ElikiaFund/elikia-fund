<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Emulates a Postgres-style partial unique index (MySQL has no native equivalent): a
     * generated column that's only non-null while a contribution is succeeded/processing, with a
     * unique index on it, so the database itself refuses a second active contribution for the
     * same (group, user, cycle_period) even if ContributionService::reserve()'s own group-level
     * lock were somehow bypassed — belt-and-suspenders, matching group_cycle_recipients' existing
     * pattern. Not required for correctness today (the lock already closes the reachable race),
     * but a real DB constraint costs little and catches anything the lock doesn't.
     */
    public function up(): void
    {
        $duplicates = DB::table('contributions')
            ->whereIn('status', ['succeeded', 'processing'])
            ->select('group_id', 'user_id', 'cycle_period')
            ->groupBy('group_id', 'user_id', 'cycle_period')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($duplicates->isNotEmpty()) {
            $offenders = $duplicates
                ->map(fn ($row) => "group {$row->group_id}/user {$row->user_id}/cycle {$row->cycle_period}")
                ->implode(', ');

            throw new RuntimeException(
                "Cannot add the active-contribution dedupe constraint — duplicate active contributions found for: {$offenders}"
            );
        }

        // SQLite has no CONCAT() (uses ||) and no inline ADD UNIQUE INDEX syntax — reached only in
        // the sqlite test environment (see phpunit.xml); production (MySQL) uses the branch below.
        // Generated-column + unique-index support confirmed present in both drivers.
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::statement(<<<'SQL'
                ALTER TABLE contributions
                ADD COLUMN active_dedupe_key VARCHAR(191)
                GENERATED ALWAYS AS (
                    CASE WHEN status IN ('succeeded', 'processing')
                        THEN group_id || '-' || user_id || '-' || cycle_period
                        ELSE NULL
                    END
                ) VIRTUAL
            SQL);

            DB::statement('CREATE UNIQUE INDEX contributions_active_dedupe_key_unique ON contributions (active_dedupe_key)');

            return;
        }

        DB::statement(<<<'SQL'
            ALTER TABLE contributions
            ADD COLUMN active_dedupe_key VARCHAR(191)
            GENERATED ALWAYS AS (
                CASE WHEN status IN ('succeeded', 'processing')
                    THEN CONCAT(group_id, '-', user_id, '-', cycle_period)
                    ELSE NULL
                END
            ) VIRTUAL
        SQL);

        DB::statement('ALTER TABLE contributions ADD UNIQUE INDEX contributions_active_dedupe_key_unique (active_dedupe_key)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::statement('DROP INDEX contributions_active_dedupe_key_unique');
            DB::statement('ALTER TABLE contributions DROP COLUMN active_dedupe_key');

            return;
        }

        DB::statement('ALTER TABLE contributions DROP INDEX contributions_active_dedupe_key_unique');
        DB::statement('ALTER TABLE contributions DROP COLUMN active_dedupe_key');
    }
};
