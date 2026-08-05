<?php

namespace App\Http\Requests\TransactionCategory;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTransactionCategoryRequest extends FormRequest
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
     * Deliberately doesn't accept `type` — a category's income/expense partition is fixed at
     * creation, only its name/icon/color are editable, so historical transactions filed under it
     * keep an unambiguous meaning.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('transaction_categories')
                    ->where(fn ($query) => $query->where('company_id', $this->company()->id)->where('type', $this->route('transactionCategory')->type))
                    ->ignore($this->route('transactionCategory')),
            ],
            'icon' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:7'],
        ];
    }
}
