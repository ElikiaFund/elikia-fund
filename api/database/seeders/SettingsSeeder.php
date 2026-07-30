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
            ['value' => ['name' => 'Elikia Fund', 'support_email' => 'support@elikiafund.com']]
        );

        Setting::updateOrCreate(
            ['key' => 'credit_scoring'],
            ['value' => ['min_score_eligible' => 70, 'min_score_review' => 40]]
        );

        // No real phone/WhatsApp/address/hours exist yet — left null rather than seeded with
        // placeholder data; admins fill these in from Paramètres > Général, and the mobile support
        // sheet simply omits whichever fields are still null.
        Setting::updateOrCreate(
            ['key' => 'contact'],
            ['value' => ['phone' => null, 'whatsapp' => null, 'address' => null, 'hours' => null]]
        );
    }
}
