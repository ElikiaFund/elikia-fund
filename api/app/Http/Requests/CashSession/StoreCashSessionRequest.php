<?php

namespace App\Http\Requests\CashSession;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCashSessionRequest extends FormRequest
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
            'uuid' => ['required', 'uuid'],
            'period_start' => ['nullable', 'date'],
            'closed_at' => ['required', 'date'],
            // Trusted from the client rather than re-derived server-side — the user confirmed
            // this exact figure on screen; recomputing at whatever later moment an offline-queued
            // close actually lands could silently disagree with what they saw and approved.
            'expected_balance' => ['required', 'numeric'],
            'counted_balance' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
