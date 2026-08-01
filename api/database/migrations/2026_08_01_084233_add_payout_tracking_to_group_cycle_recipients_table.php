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
            // Null = not yet paid out. Doubles as the idempotency guard (TontinePayoutService
            // locks this row and rejects a second payout once this is set) and the audit trail
            // (which vault_movements row the money actually landed in).
            $table->timestamp('paid_out_at')->nullable()->after('decided_at');
            $table->foreignId('vault_movement_id')->nullable()->after('paid_out_at')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('group_cycle_recipients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vault_movement_id');
            $table->dropColumn('paid_out_at');
        });
    }
};
