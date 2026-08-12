<?php

namespace App\Http\Requests\Group;

use App\Http\Requests\Group\Concerns\HasGroupSettingsRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RenewRoundRequest extends FormRequest
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
            // Unlike UpdateGroupSettingsRequest, a new round for a goal-based tontine needs a new
            // goal — "each cotisation cycle should have a goal" is deliberate, not optional. Checks
            // the effective mode (this request's own recipient_mode if changing it, else the
            // group's current one) since the owner can flip modes at renewal time too.
            'goal_text' => [Rule::requiredIf(fn () => $this->effectiveRecipientMode() === 'creator'), 'nullable', 'string', 'max:255'],
            'target_amount' => [Rule::requiredIf(fn () => $this->effectiveRecipientMode() === 'creator'), 'nullable', 'numeric', 'min:1'],
        ]);
    }

    private function effectiveRecipientMode(): ?string
    {
        return $this->input('recipient_mode') ?? $this->route('group')?->recipient_mode;
    }
}
