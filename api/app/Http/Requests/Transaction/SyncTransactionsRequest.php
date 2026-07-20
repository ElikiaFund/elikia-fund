<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncTransactionsRequest extends FormRequest
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
            'transactions' => ['required', 'array', 'min:1'],
            'transactions.*.uuid' => ['required', 'uuid'],
            'transactions.*.type' => ['required', 'string', Rule::in(['income', 'expense'])],
            'transactions.*.amount' => ['required', 'numeric', 'min:0.01'],
            'transactions.*.category' => ['required', 'string', 'max:255'],
            'transactions.*.note' => ['nullable', 'string'],
            'transactions.*.product_name' => ['nullable', 'string', 'max:255'],
            'transactions.*.quantity' => ['nullable', 'integer', 'min:1'],
            'transactions.*.occurred_at' => ['required', 'date'],
        ];
    }
}
