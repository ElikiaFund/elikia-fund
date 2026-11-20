<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Things staff must act on that used to exist only in the server log: a withdrawal Yabeto
     * couldn't confirm (needs_review), or a Connect refund/reversal Yabeto blocked because
     * Elikia's own balance is too low. Shown in the back-office and e-mailed to support.
     * Acknowledgement is shared — one admin handling it clears it for everyone.
     */
    public function up(): void
    {
        Schema::create('admin_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('type', 64);
            $table->string('title');
            $table->text('body');
            $table->json('data')->nullable();
            $table->foreignId('vault_movement_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('acknowledged_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['acknowledged_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_alerts');
    }
};
