<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateScoringCriterionRequest extends FormRequest
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
            'weight' => ['required', 'integer', 'min:0', 'max:100'],
            'is_active' => ['required', 'boolean'],
            'thresholds' => ['required', 'array', 'min:1'],
            'thresholds.*.min' => ['required', 'numeric'],
            'thresholds.*.max' => ['nullable', 'numeric'],
            'thresholds.*.points' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }
}
