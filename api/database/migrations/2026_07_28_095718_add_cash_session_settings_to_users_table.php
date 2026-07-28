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
        Schema::table('users', function (Blueprint $table) {
            // Cash-session cadence config — mirrors Group's inline frequency/contribution_day/
            // contribution_time columns (no per-user settings table exists in this codebase).
            // Defaults are deliberately "on" so the feature works with zero configuration.
            $table->enum('cash_session_frequency', ['daily', 'weekly'])->default('daily')->after('push_token');
            $table->unsignedTinyInteger('cash_session_day')->nullable()->after('cash_session_frequency');
            $table->time('cash_session_reminder_time')->nullable()->default('20:00:00')->after('cash_session_day');
            $table->boolean('cash_session_reminders_enabled')->default(true)->after('cash_session_reminder_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cash_session_frequency', 'cash_session_day', 'cash_session_reminder_time', 'cash_session_reminders_enabled']);
        });
    }
};
