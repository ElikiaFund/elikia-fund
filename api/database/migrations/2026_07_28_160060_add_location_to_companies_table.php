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
        Schema::table('companies', function (Blueprint $table) {
            // The Republic of Congo's 15 current departments (restructured from 12 in Oct 2024 —
            // see Company::DEPARTMENTS). Nullable at the DB level regardless of validation, so
            // pre-migration companies aren't broken.
            $table->enum('department', [
                'sangha', 'likouala', 'congo_oubangui', 'cuvette', 'cuvette_ouest', 'nkeni_alima',
                'plateaux', 'djoue_lefini', 'brazzaville', 'pool', 'bouenza', 'lekoumou', 'niari',
                'kouilou', 'pointe_noire',
            ])->nullable()->after('other_category');
            // Free text, not an enum — commune/city-level data is genuinely incomplete even in
            // authoritative sources this soon after the reform (see Company::DEPARTMENT_CAPITALS).
            $table->string('city')->nullable()->after('department');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['department', 'city']);
        });
    }
};
