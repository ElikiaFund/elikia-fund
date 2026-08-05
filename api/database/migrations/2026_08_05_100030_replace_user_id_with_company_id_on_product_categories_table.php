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
            $table->dropUnique(['user_id', 'name']);
            $table->dropConstrainedForeignId('user_id');
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
            $table->dropUnique(['company_id', 'name']);
            $table->dropConstrainedForeignId('company_id');
            $table->foreignId('user_id')->after('id')->constrained()->cascadeOnDelete();
            $table->unique(['user_id', 'name']);
        });
    }
};
