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
        Schema::table('contributions', function (Blueprint $table) {
            // Existing fee_amount/net_amount stay as-is (the total withheld / what reaches the
            // tontine) — these two split that total into Yabeto's tracked real cost and Elikia
            // Fund's actual kept margin, for reconciliation/reporting. Historical rows default to
            // 0/0 — contributions made under the old flat 3% never tracked this split.
            $table->decimal('provider_fee_amount', 12, 2)->default(0)->after('fee_amount');
            $table->decimal('platform_fee_amount', 12, 2)->default(0)->after('provider_fee_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropColumn(['provider_fee_amount', 'platform_fee_amount']);
        });
    }
};
