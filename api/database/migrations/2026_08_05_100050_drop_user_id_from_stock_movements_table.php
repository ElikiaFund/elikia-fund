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
        Schema::table('stock_movements', function (Blueprint $table) {
            // No replacement column — ownership is derived transitively via
            // product_id -> products.company_id (no query ever lists movements across a
            // whole company directly, only per-product, so a denormalized copy isn't needed).
            $table->dropConstrainedForeignId('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('product_id')->constrained()->cascadeOnDelete();
        });
    }
};
