<!--
    Server-side twin of mobile/src/lib/pdf.ts's buildFinancialDossierHtml() — same visual design
    (purple doc-type label, purple table header bands, light-purple accent boxes), but written
    against dompdf's CSS subset: no flexbox (dompdf doesn't support it), tables/inline-block
    instead. Keep both in sync if the design changes on either side.
-->
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    {{-- DejaVu Sans is bundled/embedded by dompdf itself and covers full Unicode (accents, em-dashes,
         curly quotes, guillemets) — the base-14 Helvetica/Arial fonts are non-embedded AFM fonts
         restricted to the WinAnsi 256-glyph table and silently render anything outside it as garbage. --}}
    body { font-family: 'DejaVu Sans', sans-serif; color: #1A1A17; font-size: 12px; margin: 0; padding: 0; }

    .header-table { width: 100%; border-bottom: 2px solid #A069DA; padding-bottom: 14px; margin-bottom: 18px; }
    .brand-name { font-size: 17px; font-weight: 700; color: #A069DA; }
    .doc-meta { font-size: 10px; color: #6B675E; text-align: right; }
    .doc-type { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #A069DA; margin-bottom: 6px; }
    .title { font-size: 26px; font-weight: 700; margin: 0 0 4px; }
    .subtitle { font-size: 12px; color: #6B675E; margin: 0 0 18px; }

    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #A069DA; margin-bottom: 8px; }

    .score-box { width: 100%; background: #F1EEE7; border: 1.5px solid #A069DA; border-radius: 10px; margin-bottom: 22px; }
    .score-box td { padding: 22px 26px; }
    .score-number { font-size: 40px; font-weight: 700; }
    .score-unit { font-size: 12px; color: #6B675E; margin-top: 4px; }
    .score-verdict { font-size: 17px; font-weight: 700; color: #A069DA; text-align: right; }
    .score-verdict-label { font-size: 10px; color: #6B675E; text-align: right; margin-top: 2px; }

    .narrative-box { background: #F4EDFB; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; }
    .narrative-title { font-size: 12px; font-weight: 700; color: #A069DA; margin-bottom: 6px; }
    .narrative-body { font-size: 11px; line-height: 1.6; }

    table.data { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
    table.data thead th { text-align: left; font-size: 10px; font-weight: 700; color: #FFFFFF; background: #A069DA; padding: 8px 10px; }
    table.data thead th.amount { text-align: right; }
    table.data tbody td { padding: 9px 10px; border-bottom: 1px solid #DEDACD; font-size: 11px; }
    table.data td.amount { text-align: right; font-weight: 700; }
    table.data td.amount.muted { color: #6B675E; font-weight: 500; }
    table.data td.label { font-weight: 700; }

    .footer { margin-top: 24px; text-align: center; font-size: 9px; font-style: italic; color: #6B675E; line-height: 1.6; }
</style>
</head>
<body>
    <table class="header-table" cellpadding="0" cellspacing="0">
        <tr>
            <td class="brand-name">ElikiaFund</td>
            <td class="doc-meta">Émis le {{ $issuedAt }}</td>
        </tr>
    </table>

    <div class="doc-type">Dossier de crédibilité financière</div>
    <div class="title">{{ $companyName }}</div>
    <div class="subtitle">{{ $subtitle }}</div>

    <div class="section-title">Score de confiance</div>
    <table class="score-box" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 50%;">
                <div class="score-number">{{ $score }}</div>
                <div class="score-unit">sur 100 points</div>
            </td>
            <td style="width: 50%;">
                <div class="score-verdict">{{ mb_strtoupper($verdictBadge) }}</div>
                <div class="score-verdict-label">Niveau de fiabilité estimé</div>
            </td>
        </tr>
    </table>

    <table class="data">
        <thead><tr><th>Composante</th><th class="amount">Score obtenu</th><th class="amount">Maximum</th></tr></thead>
        <tbody>
        @foreach ($breakdown as $item)
            <tr>
                <td class="label">{{ $item['label'] }}</td>
                <td class="amount">{{ $item['points'] }}</td>
                <td class="amount muted">{{ $item['max'] }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="section-title">Activité économique</div>
    <table class="data">
        <thead><tr><th>Indicateur</th><th class="amount">Valeur</th></tr></thead>
        <tbody>
            <tr><td>Nombre d&rsquo;écritures dans le journal</td><td class="amount">{{ $activity['entries_count'] }}</td></tr>
            <tr><td>Total des ventes enregistrées</td><td class="amount">{{ $activity['total_income'] }}</td></tr>
            <tr><td>Total des dépenses enregistrées</td><td class="amount">{{ $activity['total_expense'] }}</td></tr>
            <tr><td>Bénéfice net cumulé</td><td class="amount">{{ $activity['net_profit'] }}</td></tr>
            <tr><td>Revenu journalier moyen</td><td class="amount">{{ $activity['avg_daily_income'] }}</td></tr>
        </tbody>
    </table>

    <div class="section-title">Caisse &amp; épargne</div>
    <table class="data">
        <thead><tr><th>Indicateur</th><th class="amount">Valeur</th></tr></thead>
        <tbody>
            <tr><td>Solde caisse actuel</td><td class="amount">{{ $vault['balance'] }}</td></tr>
            <tr><td>Total des dépôts</td><td class="amount">{{ $vault['total_deposits'] }}</td></tr>
            <tr><td>Total des retraits</td><td class="amount">{{ $vault['total_withdrawals'] }}</td></tr>
            <tr><td>Nombre de mouvements</td><td class="amount">{{ $vault['movements_count'] }}</td></tr>
        </tbody>
    </table>

    <div class="section-title">Tontines digitales</div>
    <table class="data">
        <thead><tr><th>Indicateur</th><th class="amount">Valeur</th></tr></thead>
        <tbody>
            <tr><td>Tontines de l&rsquo;entreprise</td><td class="amount">{{ $tontine['groups_joined'] }}</td></tr>
            <tr><td>Nombre total de cotisations</td><td class="amount">{{ $tontine['contributions_count'] }}</td></tr>
            <tr><td>Total cotisé</td><td class="amount">{{ $tontine['total_contributed'] }}</td></tr>
            <tr><td>Total reçu en distribution</td><td class="amount">{{ $tontine['total_received'] }}</td></tr>
        </tbody>
    </table>

    <div class="section-title">Analyse du profil</div>
    <div class="narrative-box">
        <div class="narrative-title">Analyse du profil</div>
        <div class="narrative-body">{{ $narrative }}</div>
    </div>

    <div class="footer">
        Document généré par ElikiaFund — Plateforme de simulation financière pour commerçants informels.<br />
        Les montants présentés sont issus d'une simulation des comportements financiers et ne constituent pas une preuve d'avoirs réels.<br />
        Ce dossier vise à témoigner de la discipline financière, de la régularité et de la fiabilité démontrées sur la plateforme.
    </div>
</body>
</html>
