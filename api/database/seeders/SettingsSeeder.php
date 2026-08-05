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

        // Yabeto's tracked real cost and Elikia Fund's own kept margin, stored as independent
        // numbers rather than one total with a fixed split — either can change on its own (Yabeto
        // renegotiating their rate, or Elikia adjusting margin) without touching the other. See
        // FeeService for how these combine into fee_amount/provider_fee_amount/platform_fee_amount.
        Setting::updateOrCreate(
            ['key' => 'fees'],
            ['value' => [
                'contribution_yabeto_percent' => 3.5,
                'contribution_elikia_percent' => 1,
                'deposit_yabeto_percent' => 3.5,
                'deposit_elikia_percent' => 0.5,
                'deposit_yabeto_fixed' => 25,
                'deposit_elikia_fixed' => 75,
                'withdrawal_yabeto_percent' => 2,
                'withdrawal_elikia_percent' => 0.5,
            ]]
        );
    }
}
