<x-mail::message>
# Nouveau ticket de support

<x-mail::panel>
**De :** {{ $userName }} ({{ $email }})<br>
**Sujet :** {{ $subject }}
</x-mail::panel>

{{ $ticketMessage }}

<x-mail::button :url="rtrim(config('app.frontend_url'), '/') . '/support'">
Voir dans la console
</x-mail::button>

Répondez directement à cet e-mail pour contacter {{ $userName }} à {{ $email }}.

Cordialement,<br>
{{ config('app.name') }}
</x-mail::message>
