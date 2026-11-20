<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SettleVaultMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // `succeeded`: Yabeto's dashboard shows the payout went through. `failed`: it didn't —
            // the reserved amount goes back into the vault.
            'outcome' => ['required', 'string', Rule::in(['succeeded', 'failed'])],
            'password' => ['required', 'string'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
