<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A withdrawal Yabeto can't confirm either way is no longer auto-refunded (that could pay the
     * merchant twice if the payout did go through) — it becomes `needs_review` and support
     * settles it. These columns record why it was flagged and who settled it, and when.
     */
    public function up(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->text('review_reason')->nullable();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by_user_id');
            $table->dropColumn(['review_reason', 'reviewed_at', 'review_note']);
        });
    }
};
