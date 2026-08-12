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
            // Mirrors the owning group's company_id at the time of contribution — kept as its
            // own column (not just derived via group_id) so CreditScoreService can filter
            // contributions by company with a plain where(), same shape as every other
            // company-scoped query in this codebase.
            $table->foreignId('company_id')->after('user_id')->constrained()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
        });
    }
};
