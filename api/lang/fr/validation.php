<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | French translations for Laravel's built-in validation rule messages —
    | Laravel doesn't ship these by default past v10 (only publishes English
    | on request). Written by hand rather than pulled from a package, since
    | this app only needs the rule set its own FormRequests actually use
    | (see `attributes` below for the exact field list).
    |
    */

    'accepted' => 'Le champ :attribute doit être accepté.',
    'accepted_if' => 'Le champ :attribute doit être accepté lorsque :other est :value.',
    'active_url' => "Le champ :attribute n'est pas une URL valide.",
    'after' => 'Le champ :attribute doit être une date postérieure à :date.',
    'after_or_equal' => 'Le champ :attribute doit être une date postérieure ou égale à :date.',
    'alpha' => 'Le champ :attribute ne doit contenir que des lettres.',
    'alpha_dash' => 'Le champ :attribute ne doit contenir que des lettres, des chiffres, des tirets et des underscores.',
    'alpha_num' => 'Le champ :attribute ne doit contenir que des lettres et des chiffres.',
    'array' => 'Le champ :attribute doit être un tableau.',
    'before' => 'Le champ :attribute doit être une date antérieure à :date.',
    'before_or_equal' => 'Le champ :attribute doit être une date antérieure ou égale à :date.',
    'between' => [
        'array' => 'Le champ :attribute doit contenir entre :min et :max éléments.',
        'file' => 'Le champ :attribute doit être compris entre :min et :max kilo-octets.',
        'numeric' => 'Le champ :attribute doit être compris entre :min et :max.',
        'string' => 'Le champ :attribute doit contenir entre :min et :max caractères.',
    ],
    'boolean' => 'Le champ :attribute doit être vrai ou faux.',
    'confirmed' => 'La confirmation du champ :attribute ne correspond pas.',
    'date' => "Le champ :attribute n'est pas une date valide.",
    'date_equals' => 'Le champ :attribute doit être une date égale à :date.',
    'date_format' => 'Le champ :attribute ne correspond pas au format :format.',
    'different' => 'Les champs :attribute et :other doivent être différents.',
    'digits' => 'Le champ :attribute doit contenir :digits chiffres.',
    'digits_between' => 'Le champ :attribute doit contenir entre :min et :max chiffres.',
    'email' => 'Le champ :attribute doit être une adresse e-mail valide.',
    'ends_with' => "Le champ :attribute doit se terminer par l'une des valeurs suivantes : :values.",
    'exists' => 'La valeur sélectionnée pour :attribute est invalide.',
    'file' => 'Le champ :attribute doit être un fichier.',
    'filled' => 'Le champ :attribute doit avoir une valeur.',
    'gt' => [
        'array' => 'Le champ :attribute doit contenir plus de :value éléments.',
        'file' => 'Le champ :attribute doit être supérieur à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être supérieur à :value.',
        'string' => 'Le champ :attribute doit contenir plus de :value caractères.',
    ],
    'gte' => [
        'array' => 'Le champ :attribute doit contenir :value éléments ou plus.',
        'file' => 'Le champ :attribute doit être supérieur ou égal à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être supérieur ou égal à :value.',
        'string' => 'Le champ :attribute doit contenir au moins :value caractères.',
    ],
    'image' => 'Le champ :attribute doit être une image.',
    'in' => 'La valeur sélectionnée pour :attribute est invalide.',
    'in_array' => 'Le champ :attribute doit exister dans :other.',
    'integer' => 'Le champ :attribute doit être un nombre entier.',
    'ip' => 'Le champ :attribute doit être une adresse IP valide.',
    'json' => 'Le champ :attribute doit être une chaîne JSON valide.',
    'lt' => [
        'array' => 'Le champ :attribute doit contenir moins de :value éléments.',
        'file' => 'Le champ :attribute doit être inférieur à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être inférieur à :value.',
        'string' => 'Le champ :attribute doit contenir moins de :value caractères.',
    ],
    'lte' => [
        'array' => 'Le champ :attribute ne doit pas contenir plus de :value éléments.',
        'file' => 'Le champ :attribute doit être inférieur ou égal à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être inférieur ou égal à :value.',
        'string' => 'Le champ :attribute doit contenir au maximum :value caractères.',
    ],
    'max' => [
        'array' => 'Le champ :attribute ne doit pas contenir plus de :max éléments.',
        'file' => 'Le champ :attribute ne doit pas dépasser :max kilo-octets.',
        'numeric' => 'Le champ :attribute ne doit pas être supérieur à :max.',
        'string' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
    ],
    'mimes' => 'Le champ :attribute doit être un fichier de type : :values.',
    'min' => [
        'array' => 'Le champ :attribute doit contenir au moins :min éléments.',
        'file' => "Le champ :attribute doit être d'au moins :min kilo-octets.",
        'numeric' => "Le champ :attribute doit être d'au moins :min.",
        'string' => 'Le champ :attribute doit contenir au moins :min caractères.',
    ],
    'not_in' => 'La valeur sélectionnée pour :attribute est invalide.',
    'numeric' => 'Le champ :attribute doit être un nombre.',
    'present' => 'Le champ :attribute doit être présent.',
    'regex' => 'Le format du champ :attribute est invalide.',
    'required' => 'Le champ :attribute est obligatoire.',
    'required_if' => 'Le champ :attribute est obligatoire lorsque :other est :value.',
    'required_unless' => 'Le champ :attribute est obligatoire sauf si :other est :values.',
    'required_with' => 'Le champ :attribute est obligatoire lorsque :values est présent.',
    'required_with_all' => 'Le champ :attribute est obligatoire lorsque :values sont présents.',
    'required_without' => "Le champ :attribute est obligatoire lorsque :values n'est pas présent.",
    'required_without_all' => "Le champ :attribute est obligatoire lorsqu'aucun de :values n'est présent.",
    'same' => 'Les champs :attribute et :other doivent être identiques.',
    'size' => [
        'array' => 'Le champ :attribute doit contenir :size éléments.',
        'file' => 'Le champ :attribute doit être de :size kilo-octets.',
        'numeric' => 'Le champ :attribute doit être égal à :size.',
        'string' => 'Le champ :attribute doit contenir :size caractères.',
    ],
    'starts_with' => "Le champ :attribute doit commencer par l'une des valeurs suivantes : :values.",
    'string' => 'Le champ :attribute doit être une chaîne de caractères.',
    'timezone' => 'Le champ :attribute doit être un fuseau horaire valide.',
    'unique' => 'La valeur du champ :attribute est déjà utilisée.',
    'url' => 'Le format du champ :attribute est invalide.',
    'uuid' => 'Le champ :attribute doit être un UUID valide.',
    'lowercase' => 'Le champ :attribute doit être en minuscules.',

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Attributes
    |--------------------------------------------------------------------------
    |
    | French labels substituted for :attribute above, covering every field
    | name validated across app/Http/Requests. Anything not listed here still
    | validates correctly — it just falls back to showing the raw field key.
    */

    'attributes' => [
        'name' => 'nom',
        'email' => 'adresse e-mail',
        'password' => 'mot de passe',
        'password_confirmation' => 'confirmation du mot de passe',
        'current_password' => 'mot de passe actuel',
        'pin' => 'code PIN',
        'pin_confirmation' => 'confirmation du code PIN',
        'phone' => 'numéro de téléphone',
        'amount' => 'montant',
        'payment_method' => 'moyen de paiement',
        'category' => 'catégorie',
        'other_category' => 'autre catégorie',
        'contribution_amount' => 'montant de la cotisation',
        'frequency' => 'fréquence',
        'max_members' => 'nombre de participants',
        'invite_code' => "code d'invitation",
        'note' => 'note',
        'occurred_at' => 'date',
        'product_name' => 'produit',
        'quantity' => 'quantité',
        'type' => 'type',
        'uuid' => 'identifiant',
        'unit_price' => 'prix unitaire',
        'description' => 'description',
        'role_id' => 'rôle',
        'permission_ids' => 'permissions',
        'weight' => 'poids',
        'is_active' => 'actif',
        'is_enabled' => 'activé',
        'thresholds' => 'seuils',
        'mode' => 'environnement',
        'account_id' => 'identifiant de compte',
        'secret_key' => 'clé secrète',
        'webhook_secret' => 'secret webhook',
        'id_token' => "jeton d'identification",
        'identity_token' => "jeton d'identité",
        'access_token' => 'jeton d\'accès',
        'platform.name' => 'nom de la plateforme',
        'platform.support_email' => 'e-mail de support',
        'credit_scoring.min_score_eligible' => "seuil d'éligibilité",
        'credit_scoring.min_score_review' => 'seuil de revue',
        'transactions.*.amount' => 'montant',
        'transactions.*.category' => 'catégorie',
        'transactions.*.note' => 'note',
        'transactions.*.occurred_at' => 'date',
        'transactions.*.product_name' => 'produit',
        'transactions.*.quantity' => 'quantité',
        'transactions.*.type' => 'type',
        'transactions.*.uuid' => 'identifiant',
    ],

];
