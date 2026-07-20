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
        Schema::create('vault_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vault_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['deposit', 'withdraw']);
            $table->decimal('amount', 12, 2);
            $table->text('note')->nullable();
            $table->string('provider')->nullable();
            $table->string('status')->default('completed');
            $table->string('yabeto_reference')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vault_movements');
    }
};
