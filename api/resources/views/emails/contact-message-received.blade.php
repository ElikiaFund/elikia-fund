<x-mail::message>
# Nouveau message de contact

<x-mail::panel>
**De :** {{ $senderName }} ({{ $email }})<br>
**Sujet :** {{ $subject }}
</x-mail::panel>

{{ $contactMessage }}

<x-mail::button :url="rtrim(config('app.frontend_url'), '/') . '/contact'">
Voir dans la console
</x-mail::button>

Répondez directement à cet e-mail pour contacter {{ $senderName }} à {{ $email }}.

Cordialement,<br>
{{ config('app.name') }}
</x-mail::message>
