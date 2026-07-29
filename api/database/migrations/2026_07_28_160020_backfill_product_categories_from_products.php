<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * products.category was a free string before this feature introduced a real
     * product_categories table — turn every distinct (user_id, category) pair that already
     * exists into a real category row, so no existing data is silently lost when the old
     * column is dropped in the next migration.
     */
    public function up(): void
    {
        $rows = DB::table('products')->whereNotNull('category')->select('user_id', 'category')->distinct()->get();

        foreach ($rows as $row) {
            $categoryId = DB::table('product_categories')
                ->where('user_id', $row->user_id)
                ->where('name', $row->category)
                ->value('id');

            if (! $categoryId) {
                $categoryId = DB::table('product_categories')->insertGetId([
                    'user_id' => $row->user_id,
                    'name' => $row->category,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('products')
                ->where('user_id', $row->user_id)
                ->where('category', $row->category)
                ->update(['category_id' => $categoryId]);
        }
    }

    /**
     * Reverse the migrations.
     *
     * Structural reverse only — this does not attempt to un-backfill the created category rows
     * (same one-way convention as add_status_to_group_members_table.php's approved_at backfill).
     */
    public function down(): void
    {
        DB::table('products')->update(['category_id' => null]);
    }
};
