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
            $table->timestamp('recipient_order_updated_at')->nullable()->after('recipient_order');
            $table->foreignId('recipient_order_updated_by')->nullable()->after('recipient_order_updated_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recipient_order_updated_by');
            $table->dropColumn('recipient_order_updated_at');
        });
    }
};
