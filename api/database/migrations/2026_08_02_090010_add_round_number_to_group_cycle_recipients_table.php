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
        Schema::table('group_cycle_recipients', function (Blueprint $table) {
            // Every pre-existing row is definitionally round 1 — default(1) backfills for free.
            $table->unsignedInteger('round_number')->default(1)->after('user_id');
            $table->index(['group_id', 'round_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('group_cycle_recipients', function (Blueprint $table) {
            $table->dropColumn('round_number');
            $table->dropIndex(['group_id', 'round_number']);
        });
    }
};
