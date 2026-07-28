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
        // One row per *completed* closing only — no "open session" row, no status column. The
        // period a closing covers is rolling: period_start is the previous session's closed_at
        // (null for a user's first-ever closing, meaning "since the beginning"), not a
        // calendar-aligned boundary — closing late reconciles everything since you last counted,
        // exactly like a physical till.
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->dateTime('period_start')->nullable();
            $table->dateTime('closed_at');
            $table->decimal('expected_balance', 12, 2);
            $table->decimal('counted_balance', 12, 2);
            $table->decimal('variance', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'closed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_sessions');
    }
};
