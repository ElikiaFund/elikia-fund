<?php

namespace App\Http\Requests\Group;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateGroupRequest extends FormRequest
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
            // Which of the creator's own companies this tontine is attributed to — fixed for the
            // tontine's lifetime (see Group::company(), TontinePayoutService::disburse()).
            'company_id' => ['required', 'integer', Rule::exists('companies', 'id')->where('user_id', $this->user()->id)],
            'contribution_amount' => ['required', 'numeric', 'min:1'],
            'frequency' => ['required', 'string', Rule::in(['weekly', 'monthly'])],
            'max_members' => ['nullable', 'integer', 'min:2', 'max:1000'],
            // Weekly: ISO day-of-week (1=Monday..7=Sunday). Monthly: day-of-month (1-31).
            'contribution_day' => ['nullable', 'integer', 'min:1', 'max:31'],
            'contribution_time' => ['nullable', 'date_format:H:i'],
            'recipient_mode' => ['nullable', 'string', Rule::in(['predefined', 'join_order', 'random', 'admin', 'creator'])],
            // Only meaningful (and required) for recipient_mode = 'creator' — a goal-based tontine
            // has no rotating beneficiary, so it needs a stated objective instead. See Group::roundGoals().
            'goal_text' => [Rule::requiredIf(fn () => $this->input('recipient_mode') === 'creator'), 'nullable', 'string', 'max:255'],
            'target_amount' => [Rule::requiredIf(fn () => $this->input('recipient_mode') === 'creator'), 'nullable', 'numeric', 'min:1'],
        ];
    }
}
