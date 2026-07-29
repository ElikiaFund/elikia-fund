<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Kept as its own migration (not merged into the column-add or backfill migrations above) so
     * there's an inspectable checkpoint between "category_id populated" and "old string gone
     * forever" — defer this one specifically if it ever runs against a database with real
     * products.category data, until the backfill above is confirmed correct.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('category')->nullable()->after('category_id');
        });
    }
};
