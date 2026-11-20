<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `vault_movements.vault_id` is NOT NULL historically because every movement reflected a
     * balance mutation on an Elikia-side vault. Under Connect routing (Phase A), a tontine
     * payout to a Connect-ready group means funds leave Yabeto's system entirely for the
     * merchant's registered mobile money number — the company's internal vault is NOT touched,
     * so forcing a `vault_id` here would require inventing a fake vault reference just to
     * satisfy the FK.
     *
     * Making the column nullable lets `TontinePayoutService::disburse()` write an audit row
     * for Connect payouts without pretending a vault balance moved. Legacy flows keep setting
     * it exactly as before.
     */
    public function up(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->foreignId('vault_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->foreignId('vault_id')->nullable(false)->change();
        });
    }
};
