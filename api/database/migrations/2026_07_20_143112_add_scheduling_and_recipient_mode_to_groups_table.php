<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            // Day-of-week (ISO, 1=Monday..7=Sunday) for weekly groups, or day-of-month (1-31)
            // for monthly groups — the due-moment contributions are scheduled around, e.g.
            // "tous les lundis à 18h" or "tous les 5 du mois à 15h". Null means unscheduled
            // (falls back to the plain calendar week/month boundary).
            $table->unsignedTinyInteger('contribution_day')->nullable()->after('frequency');
            $table->time('contribution_time')->nullable()->after('contribution_day');

            // How the recipient of each reception cycle's pooled contributions is picked —
            // a concept distinct from the contribution cycle itself. See GroupCycleRecipient.
            $table->string('recipient_mode')->default('join_order')->after('max_members');
            $table->json('recipient_order')->nullable()->after('recipient_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropColumn(['contribution_day', 'contribution_time', 'recipient_mode', 'recipient_order']);
        });
    }
};
