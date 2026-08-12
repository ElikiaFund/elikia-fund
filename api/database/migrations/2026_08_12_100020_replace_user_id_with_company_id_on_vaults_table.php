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
        Schema::table('vaults', function (Blueprint $table) {
            // user_id carries both an FK constraint and a unique index — both must be dropped
            // explicitly before the column itself, in that order (see the companies/transactions
            // migrations earlier in this project for the same MySQL/SQLite DROP COLUMN ordering
            // requirement — dropConstrainedForeignId() alone doesn't also drop a separate unique
            // index, and neither engine allows dropping a column still referenced by one).
            $table->dropForeign(['user_id']);
            $table->dropUnique(['user_id']);
            $table->dropColumn('user_id');
            $table->foreignId('company_id')->after('id')->unique()->constrained()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vaults', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropUnique(['company_id']);
            $table->dropColumn('company_id');
            $table->foreignId('user_id')->after('id')->unique()->constrained()->cascadeOnDelete();
        });
    }
};
