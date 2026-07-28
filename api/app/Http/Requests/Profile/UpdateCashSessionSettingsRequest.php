<?php

namespace App\Http\Requests\Profile;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCashSessionSettingsRequest extends FormRequest
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
            'cash_session_frequency' => ['required', 'string', Rule::in(['daily', 'weekly'])],
            // ISO day-of-week (1=Monday..7=Sunday), weekly only.
            'cash_session_day' => ['nullable', 'integer', 'min:1', 'max:7'],
            'cash_session_reminder_time' => ['nullable', 'date_format:H:i'],
            'cash_session_reminders_enabled' => ['required', 'boolean'],
        ];
    }
}
