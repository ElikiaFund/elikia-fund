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
        Schema::create('group_round_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained()->cascadeOnDelete();
            // One goal per round for recipient_mode = 'creator' groups — the objective is meant to
            // change every time the owner renews a round (see GroupController::store/renewRound).
            $table->unsignedInteger('round_number');
            $table->string('goal_text');
            $table->decimal('target_amount', 12, 2);
            $table->timestamps();
            $table->unique(['group_id', 'round_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_round_goals');
    }
};
