<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
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
            'platform' => ['sometimes', 'array'],
            'platform.name' => ['required_with:platform', 'string', 'max:255'],
            'platform.support_email' => ['required_with:platform', 'email', 'max:255'],

            'credit_scoring' => ['sometimes', 'array'],
            'credit_scoring.min_score_eligible' => ['required_with:credit_scoring', 'integer', 'min:0', 'max:100'],
            'credit_scoring.min_score_review' => ['required_with:credit_scoring', 'integer', 'min:0', 'max:100', 'lt:credit_scoring.min_score_eligible'],
        ];
    }
}
