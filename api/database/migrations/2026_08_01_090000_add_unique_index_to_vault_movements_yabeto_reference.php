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
        // Due diligence on a live table: MySQL/InnoDB treats every NULL as distinct, so this only
        // ever matters for rows that already carry a real yabeto_reference — surface any
        // pre-existing duplicate loudly, with the offending references, rather than letting the
        // constraint below fail mid-deploy with a generic MySQL error.
        $duplicates = DB::table('vault_movements')
            ->whereNotNull('yabeto_reference')
            ->select('yabeto_reference')
            ->groupBy('yabeto_reference')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('yabeto_reference');

        if ($duplicates->isNotEmpty()) {
            throw new RuntimeException(
                'Cannot add a unique index on vault_movements.yabeto_reference — duplicate references found: '.$duplicates->implode(', ')
            );
        }

        Schema::table('vault_movements', function (Blueprint $table) {
            $table->unique('yabeto_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->dropUnique(['yabeto_reference']);
        });
    }
};
