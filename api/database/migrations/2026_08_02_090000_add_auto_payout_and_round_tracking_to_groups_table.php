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
            $table->boolean('auto_payout_enabled')->default(true)->after('recipient_order');
            $table->unsignedInteger('round_number')->default(1)->after('auto_payout_enabled');
            // Plain string, not a MySQL ENUM — matches recipient_mode/contributions.status, so it
            // can gain a value later without a raw ALTER. Only 'active'/'completed' used today.
            $table->string('round_status')->default('active')->after('round_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropColumn(['auto_payout_enabled', 'round_number', 'round_status']);
        });
    }
};
