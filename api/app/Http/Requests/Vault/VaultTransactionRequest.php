<?php

namespace App\Http\Requests\Vault;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VaultTransactionRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'min:1'],
            'pin' => ['required', 'digits:4'],
            // Required everywhere except a verified Connect withdrawal, which always pays the
            // number registered during KYC — enforced in VaultController.
            'payment_method' => ['nullable', 'string', Rule::in(['mtn_momo', 'airtel_money'])],
            // Only actually required when Yabeto is enabled — enforced in VaultController, not
            // here, so the simulated path (the default) doesn't force every dev/demo user to
            // type a phone number for a mock transaction.
            'phone' => ['nullable', 'string', 'max:30'],
        ];
    }
}
