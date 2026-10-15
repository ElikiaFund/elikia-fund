<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yabeto_settings', function (Blueprint $table) {
            // Cached from GET /v1/connect/activations — docs/fr/connect/quickstart §1. We refuse to
            // issue Connect calls until this reads 'account' (Elikia's chosen fee_payer mode), so
            // misconfigured keys fail loudly in the back-office test panel rather than at the
            // first merchant deposit.
            $table->string('connect_mode', 32)->nullable();
            $table->timestamp('connect_activation_checked_at')->nullable();

            // Default Elikia commission on tontine direct charges (percentage, 0 = no commission).
            // Required field pair with on_behalf_of on every Connect direct charge, hence stored
            // centrally instead of per-group so finance can retune without a redeploy.
            $table->decimal('default_application_fee_rate', 5, 2)->default(0);

            // Separate on/off switch for Connect-specific routing, independent of the top-level
            // `is_enabled` flag. Lets an admin keep plain Payment Intents (vault flows) running
            // while Connect is being brought up or if it has to be rolled back.
            $table->boolean('connect_enabled')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('yabeto_settings', function (Blueprint $table) {
            $table->dropColumn([
                'connect_mode',
                'connect_activation_checked_at',
                'default_application_fee_rate',
                'connect_enabled',
            ]);
        });
    }
};
