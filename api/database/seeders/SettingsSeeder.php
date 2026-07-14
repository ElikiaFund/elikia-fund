<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Setting::updateOrCreate(
            ['key' => 'platform'],
            ['value' => ['name' => 'Elikia Fund', 'support_email' => 'support@elikia-fund.test']]
        );

        Setting::updateOrCreate(
            ['key' => 'credit_scoring'],
            ['value' => ['min_score_eligible' => 70, 'min_score_review' => 40]]
        );
    }
}
