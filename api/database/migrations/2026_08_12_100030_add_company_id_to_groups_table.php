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
            // Not unique — a company can own many tontines. Membership (group_members.user_id)
            // stays person-based; this only decides where cotisations/versements are attributed
            // (vault credit destination, credit-score counting) — see TontinePayoutService.
            $table->foreignId('company_id')->after('owner_id')->constrained()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
        });
    }
};
