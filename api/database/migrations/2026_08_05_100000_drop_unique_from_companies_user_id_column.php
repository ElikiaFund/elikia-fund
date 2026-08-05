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
            // Order matters: each Blueprint command runs as its own ALTER TABLE statement, so the
            // plain index must exist BEFORE the unique one is dropped — otherwise MySQL refuses to
            // drop it (error 1553: the FK constraint on user_id needs a backing index at all times).
            $table->index('user_id');
            $table->dropUnique(['user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->unique('user_id');
            $table->dropIndex(['user_id']);
        });
    }
};
