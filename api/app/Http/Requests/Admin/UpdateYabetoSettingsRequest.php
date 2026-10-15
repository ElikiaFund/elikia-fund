<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateYabetoSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'mode' => ['sometimes', 'string', Rule::in(['sandbox', 'live'])],
            'account_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            // Blank/omitted means "leave the currently-stored key alone" — see
            // Admin\YabetoSettingController@update.
            'secret_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'webhook_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_enabled' => ['sometimes', 'boolean'],
            // Connect-specific — `connect_mode` is read-only (populated by connectStatus()
            // from Yabeto's own API) and never settable from the back-office, so it's absent
            // here on purpose. `default_application_fee_rate` is a percentage, bounded 0..100
            // to match Yabeto's `application_fee_rate` field range (docs/fr/connect/pricing).
            'connect_enabled' => ['sometimes', 'boolean'],
            'default_application_fee_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            // Required only when switching from 'sandbox' to 'live' — enforced (not just
            // validated) in Admin\YabetoSettingController@update, since whether it's required
            // depends on the currently-stored mode, not just this request's payload.
            'password' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
