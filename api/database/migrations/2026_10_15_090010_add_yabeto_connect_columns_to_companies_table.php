<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-company Yabeto Connect columns. Only populated for merchants who signed up after
     * Connect was turned on — legacy companies keep `yabeto_account_id = null` and continue to
     * transact on Elikia's own Yabeto account (today's flow). Presence of `yabeto_account_id`
     * is the single flag every money service's router branches on; see each service's
     * `shouldUseConnect()` helper.
     *
     * `yabeto_capabilities` mirrors GET /v1/connect/accounts/{acct}/compliance.capabilities
     * verbatim; a reader checks `allowed_operations` for `"withdraw"` to decide whether a
     * Connect withdrawal is safe to attempt. We don't flatten this into a boolean column
     * because Yabeto may add more operations later and we want them available without a
     * migration.
     *
     * No webhook fires on verification state changes (docs/fr/connect/accounts/onboarding
     * "Aucun webhook n'est émis…"), so `yabeto_compliance_checked_at` is driven by the
     * scheduled `yabeto:sync-compliance` command.
     */
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            // Set when a company is created while Connect is live — even if provisioning its
            // account fails — so it can never slip into the legacy (Elikia-custody) money flow.
            // Its vault and tontines stay locked until Yabeto approves its KYC.
            $table->boolean('yabeto_connect_required')->default(false);
            $table->string('yabeto_account_id', 64)->nullable()->unique();
            $table->text('yabeto_onboarding_url')->nullable();
            $table->timestamp('yabeto_onboarding_expires_at')->nullable();
            $table->string('yabeto_verification_status', 32)->nullable();
            $table->json('yabeto_capabilities')->nullable();
            $table->timestamp('yabeto_compliance_checked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropUnique(['yabeto_account_id']);
            $table->dropColumn([
                'yabeto_connect_required',
                'yabeto_account_id',
                'yabeto_onboarding_url',
                'yabeto_onboarding_expires_at',
                'yabeto_verification_status',
                'yabeto_capabilities',
                'yabeto_compliance_checked_at',
            ]);
        });
    }
};
