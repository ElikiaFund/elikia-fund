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
        Schema::table('contributions', function (Blueprint $table) {
            // Null for self-service (Yabeto/simulated) contributions — set only when the owner
            // records a cash/manual contribution on a member's behalf.
            $table->foreignId('recorded_by')->nullable()->after('provider')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recorded_by');
        });
    }
};
