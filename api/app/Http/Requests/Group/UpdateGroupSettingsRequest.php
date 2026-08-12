<?php

namespace App\Http\Requests\Group;

use App\Http\Requests\Group\Concerns\HasGroupSettingsRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateGroupSettingsRequest extends FormRequest
{
    use HasGroupSettingsRules;

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
        return array_merge($this->groupSettingsRules(), [
            // Optional tweak to the *current* round's goal (recipient_mode = 'creator' only) — a
            // no-op on any other group, see GroupController::updateSettings().
            'goal_text' => ['sometimes', 'string', 'max:255'],
            'target_amount' => ['sometimes', 'numeric', 'min:1'],
        ]);
    }
}
