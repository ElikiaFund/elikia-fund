<x-mail::message>
# Nouveau ticket de support

**De :** {{ $userName }} ({{ $email }})

**Sujet :** {{ $subject }}

{{ $ticketMessage }}

---

Répondez directement à cet e-mail pour contacter {{ $userName }} à {{ $email }}.

Cordialement,<br>
{{ config('app.name') }}
</x-mail::message>
