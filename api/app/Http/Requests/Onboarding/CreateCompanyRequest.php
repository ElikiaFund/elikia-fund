<?php

namespace App\Http\Requests\Onboarding;

use App\Models\Company;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateCompanyRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', Rule::in(Company::CATEGORIES)],
            'other_category' => ['nullable', 'string', 'max:255', 'required_if:category,autre'],
            'department' => ['required', 'string', Rule::in(Company::DEPARTMENTS)],
            // Free text, not Rule::in() — see Company::DEPARTMENT_CAPITALS for why.
            'city' => ['required', 'string', 'max:255'],
        ];
    }
}
