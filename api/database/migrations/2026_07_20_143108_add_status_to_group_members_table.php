<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('group_members', function (Blueprint $table) {
            // 'pending' until the group owner approves the join request, 'approved' once the
            // member can contribute. Existing rows predate the approval workflow, so they
            // default to 'approved' — nobody who was already a member gets locked out.
            $table->string('status')->default('approved')->after('user_id');
            $table->timestamp('approved_at')->nullable()->after('joined_at');
        });

        DB::table('group_members')->where('status', 'approved')->update(['approved_at' => DB::raw('joined_at')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('group_members', function (Blueprint $table) {
            $table->dropColumn(['status', 'approved_at']);
        });
    }
};
