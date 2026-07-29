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
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('category')->constrained('product_categories')->nullOnDelete();
            $table->decimal('cost_price', 12, 2)->nullable()->after('category_id');
            $table->renameColumn('unit_price', 'sell_price');
            $table->boolean('tracks_stock')->default(false)->after('sell_price');
            $table->unsignedInteger('stock_quantity')->default(0)->after('tracks_stock');
            $table->unsignedInteger('low_stock_threshold')->nullable()->after('stock_quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn(['cost_price', 'tracks_stock', 'stock_quantity', 'low_stock_threshold']);
            $table->renameColumn('sell_price', 'unit_price');
        });
    }
};
