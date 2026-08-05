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
        Schema::create('group_deletion_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_deletion_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('decision', ['approved', 'declined']);
            $table->dateTime('decided_at');
            $table->timestamps();

            $table->unique(['group_deletion_request_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_deletion_votes');
    }
};
