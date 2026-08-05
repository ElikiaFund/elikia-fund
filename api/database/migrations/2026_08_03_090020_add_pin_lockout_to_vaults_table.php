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
        Schema::table('vaults', function (Blueprint $table) {
            // Mirrors pin_hash: mutated only by VaultSecurityService, never mass-assigned.
            $table->unsignedTinyInteger('failed_pin_attempts')->default(0)->after('pin_set_at');
            $table->timestamp('locked_until')->nullable()->after('failed_pin_attempts');
            // Tracks the escalation tier (15 min, 30 min, 60 min, ... capped at 24h) — decays
            // back to tier 1 once lockout_count_reset_at has passed.
            $table->unsignedTinyInteger('lockout_count')->default(0)->after('locked_until');
            $table->timestamp('lockout_count_reset_at')->nullable()->after('lockout_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vaults', function (Blueprint $table) {
            $table->dropColumn(['failed_pin_attempts', 'locked_until', 'lockout_count', 'lockout_count_reset_at']);
        });
    }
};
