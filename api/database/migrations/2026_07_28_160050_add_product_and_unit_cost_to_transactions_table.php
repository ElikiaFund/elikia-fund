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
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('product_name')->constrained()->nullOnDelete();
            // Snapshot of the product's cost_price at the moment of this transaction — captured
            // server-side so margin stays historically accurate even if the product's cost_price
            // changes later. Never accepted from the client, see ProductStockService::applyProductLink().
            $table->decimal('unit_cost', 12, 2)->nullable()->after('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn('unit_cost');
        });
    }
};
