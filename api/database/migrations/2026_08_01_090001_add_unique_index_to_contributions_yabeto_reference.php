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
        // See the equivalent migration on vault_movements.yabeto_reference for why this check
        // runs first — same due diligence, same reasoning.
        $duplicates = DB::table('contributions')
            ->whereNotNull('yabeto_reference')
            ->select('yabeto_reference')
            ->groupBy('yabeto_reference')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('yabeto_reference');

        if ($duplicates->isNotEmpty()) {
            throw new RuntimeException(
                'Cannot add a unique index on contributions.yabeto_reference — duplicate references found: '.$duplicates->implode(', ')
            );
        }

        Schema::table('contributions', function (Blueprint $table) {
            $table->unique('yabeto_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropUnique(['yabeto_reference']);
        });
    }
};
