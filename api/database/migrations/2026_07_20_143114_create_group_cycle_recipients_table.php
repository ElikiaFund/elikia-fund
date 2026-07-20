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
        // Who receives the pooled contributions for a given reception cycle — kept as its own
        // table (not a column on Contribution) because the reception cycle is a distinct concept
        // from the contribution cycle: members pay in every cycle_period, but only one of them
        // is the beneficiary of that cycle's pot.
        Schema::create('group_cycle_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained()->cascadeOnDelete();
            $table->string('cycle_period');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('method');
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->unique(['group_id', 'cycle_period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_cycle_recipients');
    }
};
