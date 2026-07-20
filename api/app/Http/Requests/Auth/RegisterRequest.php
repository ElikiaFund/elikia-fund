<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
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
            // E.164-ish: a leading + then 7–15 digits — permissive on purpose, the mobile client
            // is responsible for building a well-formed number per the selected country (see
            // mobile/src/constants/countries.ts), this just rejects obvious garbage.
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{6,14}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
        ];
    }
}
