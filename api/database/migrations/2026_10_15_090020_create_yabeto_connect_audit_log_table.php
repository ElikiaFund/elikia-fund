<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only log of every state-changing Connect operation CompanyConnectService performs.
     * Mirrors the "audit trail row inside a DB::transaction" pattern Elikia's other services
     * follow (ProductStockService, VaultTransactionService) — Connect calls happen on Yabeto's
     * side so without a local log, the back-office can't tell "who re-issued this merchant's
     * onboarding link last week". Also serves the custody-defense story: if a regulator asks
     * what we did and when, the answer is here.
     */
    public function up(): void
    {
        Schema::create('yabeto_connect_audit_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            // Actor is nullable because scheduled commands (yabeto:sync-compliance) run without
            // an authenticated user; those rows get a `source` of "schedule" or similar.
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 64);
            $table->string('source', 32)->default('admin'); // admin | mobile | schedule | signup
            $table->string('result', 16); // success | failure
            $table->text('reason')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('created_at');

            $table->index(['company_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yabeto_connect_audit_log');
    }
};
