<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Connect commissions now come from Elikia's own fee grid (FeeService::applicationFeeRate()),
     * so the single flat rate stored here is no longer read anywhere.
     */
    public function up(): void
    {
        if (Schema::hasColumn('yabeto_settings', 'default_application_fee_rate')) {
            Schema::table('yabeto_settings', function (Blueprint $table) {
                $table->dropColumn('default_application_fee_rate');
            });
        }
    }

    public function down(): void
    {
        Schema::table('yabeto_settings', function (Blueprint $table) {
            $table->decimal('default_application_fee_rate', 5, 2)->default(0);
        });
    }
};
