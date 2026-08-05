<?php

namespace App\Http\Requests\TransactionCategory;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionCategoryRequest extends FormRequest
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
            'type' => ['required', 'string', Rule::in(['income', 'expense'])],
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('transaction_categories')
                    ->where(fn ($query) => $query->where('company_id', $this->company()->id)->where('type', $this->string('type'))),
            ],
            'icon' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:7'],
        ];
    }
}
