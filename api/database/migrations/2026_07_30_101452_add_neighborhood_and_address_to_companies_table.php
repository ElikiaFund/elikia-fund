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
            // Nullable at the DB level regardless of validation, so pre-migration companies
            // aren't broken — same reasoning as department/city above.
            $table->string('neighborhood')->nullable()->after('city');
            $table->string('address')->nullable()->after('neighborhood');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['neighborhood', 'address']);
        });
    }
};
