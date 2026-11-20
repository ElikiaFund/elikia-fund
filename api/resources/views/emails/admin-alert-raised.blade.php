<x-mail::message>
# {{ $title }}

{{ $body }}

<x-mail::button :url="rtrim(config('app.frontend_url'), '/') . $path">
Ouvrir la console
</x-mail::button>

Cette alerte reste visible dans la console tant qu'elle n'a pas été marquée comme traitée.

Cordialement,<br>
{{ config('app.name') }}
</x-mail::message>
