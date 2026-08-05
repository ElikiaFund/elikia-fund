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
        Schema::table('cash_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->foreignId('company_id')->after('uuid')->constrained()->cascadeOnDelete();
            $table->index(['company_id', 'closed_at']);
            $table->dropIndex(['user_id', 'closed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
            $table->foreignId('user_id')->after('uuid')->constrained()->cascadeOnDelete();
            $table->index(['user_id', 'closed_at']);
            $table->dropIndex(['company_id', 'closed_at']);
        });
    }
};
