<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            // amount stays the gross figure (what's sent to/collected via Yabeto). These four
            // track the fee withheld and what actually moves the vault balance — mirrors
            // contributions' fee_amount/net_amount shape, plus the Yabeto/Elikia split for
            // reconciliation.
            $table->decimal('fee_amount', 12, 2)->default(0)->after('amount');
            $table->decimal('provider_fee_amount', 12, 2)->default(0)->after('fee_amount');
            $table->decimal('platform_fee_amount', 12, 2)->default(0)->after('provider_fee_amount');
            $table->decimal('net_amount', 12, 2)->default(0)->after('platform_fee_amount');
        });

        // Historical rows had zero fee by definition (fees didn't exist yet) — net_amount must
        // equal the gross amount for every existing row, not the column's blanket 0 default.
        DB::table('vault_movements')->update(['net_amount' => DB::raw('amount')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->dropColumn(['fee_amount', 'provider_fee_amount', 'platform_fee_amount', 'net_amount']);
        });
    }
};
