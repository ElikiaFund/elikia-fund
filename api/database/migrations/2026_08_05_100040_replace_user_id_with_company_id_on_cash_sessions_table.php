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
            // Order matters, on two different databases for two different reasons: the FK
            // constraint must be dropped before the index that backs it (MySQL error 1553 — a
            // FK's column always needs a backing index), and the index must be dropped before the
            // column itself (SQLite refuses to DROP COLUMN a column still referenced by an index).
            $table->dropForeign(['user_id']);
            $table->dropIndex(['user_id', 'closed_at']);
            $table->dropColumn('user_id');
            $table->foreignId('company_id')->after('uuid')->constrained()->cascadeOnDelete();
            $table->index(['company_id', 'closed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_sessions', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropIndex(['company_id', 'closed_at']);
            $table->dropColumn('company_id');
            $table->foreignId('user_id')->after('uuid')->constrained()->cascadeOnDelete();
            $table->index(['user_id', 'closed_at']);
        });
    }
};
