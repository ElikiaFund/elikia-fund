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
        Schema::table('companies', function (Blueprint $table) {
            // A user can now own multiple companies — only the uniqueness goes, user_id stays
            // NOT NULL/FK/cascadeOnDelete as the owner column, now indexed rather than unique.
            $table->dropUnique(['user_id']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->unique('user_id');
        });
    }
};
