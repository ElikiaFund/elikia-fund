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
        ];
    }
}
