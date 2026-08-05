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
        Schema::table('product_categories', function (Blueprint $table) {
            // Order matters: the FK constraint must be dropped before the unique index that
            // backs it, otherwise MySQL refuses the drop (error 1553 — a FK's column always
            // needs a backing index, and this composite unique index is the only one covering
            // user_id here).
            $table->dropForeign(['user_id']);
            $table->dropUnique(['user_id', 'name']);
            $table->dropColumn('user_id');
            $table->foreignId('company_id')->after('id')->constrained()->cascadeOnDelete();
            $table->unique(['company_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_categories', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropUnique(['company_id', 'name']);
            $table->dropColumn('company_id');
            $table->foreignId('user_id')->after('id')->constrained()->cascadeOnDelete();
            $table->unique(['user_id', 'name']);
        });
    }
};
