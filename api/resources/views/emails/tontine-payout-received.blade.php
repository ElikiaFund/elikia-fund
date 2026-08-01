<x-mail::message>
# Versement reçu

Bonjour {{ $recipientName }},

<x-mail::panel>
**Tontine :** {{ $groupName }}<br>
**Montant :** {{ $amount }}
</x-mail::panel>

Ce montant a été crédité sur votre coffre Elikia Fund. Vous pouvez le retirer à tout moment ou le laisser comme épargne.

Cordialement,<br>
{{ config('app.name') }}
</x-mail::message>
