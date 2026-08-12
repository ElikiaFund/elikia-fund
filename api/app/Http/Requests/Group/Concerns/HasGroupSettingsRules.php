<?php

namespace App\Http\Requests\Group\Concerns;

use Illuminate\Validation\Rule;

/** Shared partial-update ruleset for UpdateGroupSettingsRequest and RenewRoundRequest — every field is optional (`sometimes`), matching CreateGroupRequest's own rules for the fields they have in common. */
trait HasGroupSettingsRules
{
    protected function groupSettingsRules(): array
    {
        return [
            'auto_payout_enabled' => ['sometimes', 'boolean'],
            'contribution_amount' => ['sometimes', 'numeric', 'min:1'],
            'frequency' => ['sometimes', 'string', Rule::in(['weekly', 'monthly'])],
            'max_members' => ['sometimes', 'nullable', 'integer', 'min:2', 'max:1000'],
            'recipient_mode' => ['sometimes', 'string', Rule::in(['predefined', 'join_order', 'random', 'admin', 'creator'])],
            'contribution_day' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:31'],
            'contribution_time' => ['sometimes', 'nullable', 'date_format:H:i'],
        ];
    }
}
