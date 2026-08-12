<?php

namespace App\Http\Requests\Group;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RecordManualContributionRequest extends FormRequest
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
            // Defaults to the group's current cycle when omitted — see GroupController::recordContribution.
            'cycle_period' => ['nullable', 'string', 'max:20'],
            // Defaults to the group's contribution_amount when omitted — the confirmation screen
            // pre-fills it but lets the owner correct it (e.g. a member who paid a partial or
            // adjusted cash amount).
            'amount' => ['nullable', 'numeric', 'min:1'],
            // Defaults to now() when omitted — lets the owner backdate a cash contribution to
            // when it was actually handed over, not just when it was entered in the app.
            'paid_at' => ['nullable', 'date', 'before_or_equal:now'],
        ];
    }
}
