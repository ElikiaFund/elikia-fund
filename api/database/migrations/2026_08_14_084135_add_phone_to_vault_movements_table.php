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
        Schema::table('vault_movements', function (Blueprint $table) {
            // The mobile Mobile Money phone number used for this movement — already collected and
            // sent by the app on every deposit/withdraw request, just never persisted until now.
            // Nullable: a 'tontine_payout' movement has no phone at all (it's an internal transfer).
            $table->string('phone')->nullable()->after('yabeto_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};
