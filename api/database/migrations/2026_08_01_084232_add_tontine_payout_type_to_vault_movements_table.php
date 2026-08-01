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
        if (DB::connection()->getDriverName() === 'sqlite') {
            // SQLite has no ALTER TABLE ... MODIFY COLUMN and no doctrine/dbal is installed to
            // drive Blueprint::change() — rebuild the table with the widened CHECK constraint
            // instead, preserving existing data. Only reached in the sqlite test environment
            // (see phpunit.xml); production (MySQL) uses the raw ALTER below.
            $this->rebuildSqliteTypeColumn(['deposit', 'withdraw', 'tontine_payout']);
        } else {
            // Laravel's Schema::table()->change() can't reliably widen a MySQL ENUM without
            // doctrine/dbal (which this project doesn't depend on) — raw SQL is the standard,
            // reliable way to do this.
            DB::statement("ALTER TABLE vault_movements MODIFY COLUMN type ENUM('deposit', 'withdraw', 'tontine_payout') NOT NULL");
        }

        Schema::table('vault_movements', function (Blueprint $table) {
            // Nullable — only ever set on a 'tontine_payout' movement, tracing it back to the
            // cycle that produced it. A regular deposit/withdraw leaves both null.
            $table->foreignId('group_id')->nullable()->after('vault_id')->constrained()->nullOnDelete();
            $table->string('cycle_period')->nullable()->after('group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vault_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('group_id');
            $table->dropColumn('cycle_period');
        });

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->rebuildSqliteTypeColumn(['deposit', 'withdraw']);
        } else {
            DB::statement("ALTER TABLE vault_movements MODIFY COLUMN type ENUM('deposit', 'withdraw') NOT NULL");
        }
    }

    /**
     * @param  string[]  $allowedTypes
     */
    private function rebuildSqliteTypeColumn(array $allowedTypes): void
    {
        Schema::create('vault_movements_new', function (Blueprint $table) use ($allowedTypes) {
            $table->id();
            $table->foreignId('vault_id')->constrained('vaults')->cascadeOnDelete();
            $table->enum('type', $allowedTypes);
            $table->decimal('amount', 12, 2);
            $table->text('note')->nullable();
            $table->string('provider')->nullable();
            $table->string('status')->default('completed');
            $table->string('yabeto_reference')->nullable();
            $table->timestamps();
        });

        DB::statement('INSERT INTO vault_movements_new (id, vault_id, type, amount, note, provider, status, yabeto_reference, created_at, updated_at)
            SELECT id, vault_id, type, amount, note, provider, status, yabeto_reference, created_at, updated_at FROM vault_movements');

        Schema::drop('vault_movements');
        Schema::rename('vault_movements_new', 'vault_movements');
    }
};
