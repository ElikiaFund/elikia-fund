<?php

namespace App\Http\Requests\Profile;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateProfileRequest extends FormRequest
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
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user()->id)],
            // Same permissive E.164-ish pattern as RegisterRequest — nullable since OAuth-only
            // accounts may not have one yet.
            'phone' => ['nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/', Rule::unique('users', 'phone')->ignore($this->user()->id)],
            'current_password' => ['required_with:password', 'string'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ];
    }
}
