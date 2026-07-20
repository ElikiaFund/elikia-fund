<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
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
            'uuid' => ['required', 'uuid', 'unique:transactions,uuid'],
            'type' => ['required', 'string', Rule::in(['income', 'expense'])],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'category' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
            'product_name' => ['nullable', 'string', 'max:255'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'occurred_at' => ['required', 'date'],
        ];
    }
}
