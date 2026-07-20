<?php

namespace App\Http\Requests\Group;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ContributeRequest extends FormRequest
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
            // Only actually required when Yabeto is enabled — enforced in GroupController, same
            // reasoning as VaultTransactionRequest::phone.
            'payment_method' => ['nullable', 'string', Rule::in(['mtn_momo', 'airtel_money'])],
            'phone' => ['nullable', 'string', 'max:30'],
        ];
    }
}
