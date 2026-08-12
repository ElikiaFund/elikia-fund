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
            // The vault PIN moves from vaults (1:1 with User) to users (1:1 with Company) — a
            // person has one shared PIN across every company vault they can reach, deliberately,
            // as a foundation for a later feature where multiple users on one company each use
            // their own PIN against that company's single shared vault.
            $table->string('pin_hash')->nullable();
            $table->timestamp('pin_set_at')->nullable();
            $table->unsignedTinyInteger('failed_pin_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->unsignedTinyInteger('lockout_count')->default(0);
            $table->timestamp('lockout_count_reset_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['pin_hash', 'pin_set_at', 'failed_pin_attempts', 'locked_until', 'lockout_count', 'lockout_count_reset_at']);
        });
    }
};
