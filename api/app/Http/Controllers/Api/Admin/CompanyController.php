<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\FinancialDossierService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    public function __construct(private readonly FinancialDossierService $dossier) {}

    public function index(): JsonResponse
    {
        return response()->json(Company::with('user')->latest()->get());
    }

    public function show(Company $company): JsonResponse
    {
        return response()->json($company->load([
            'user',
            'transactions' => fn ($query) => $query->latest('occurred_at'),
            'products.category',
            'cashSessions' => fn ($query) => $query->latest('closed_at'),
        ]));
    }

    public function destroy(Company $company): JsonResponse
    {
        abort_if((float) ($company->vault?->balance ?? 0) > 0, 409, 'Impossible de supprimer une entreprise dont le coffre a un solde positif.');

        $company->delete();

        return response()->json(['message' => 'Entreprise supprimée.']);
    }

    /**
     * GET /admin/companies/{company}/financial-dossier — server-rendered "Dossier de
     * crédibilité financière" PDF, the back-office twin of mobile's buildFinancialDossierHtml()
     * (same design, see resources/views/pdf/financial-dossier.blade.php). Generated on demand,
     * not cached — a company's score/activity change constantly, so a stale cached PDF would be
     * actively misleading for what's meant to double as a loan-admissibility document.
     */
    public function financialDossier(Company $company): Response
    {
        $data = $this->dossier->build($company);

        $money = fn (float $amount) => number_format($amount, 0, ',', ' ').' FCFA';
        $count = fn (int $value) => number_format($value, 0, '', ' ');

        $pdf = Pdf::loadView('pdf.financial-dossier', [
            'issuedAt' => now()->format('d/m/Y'),
            'companyName' => $data['company_name'],
            'subtitle' => collect([
                $data['phone'] ? "Téléphone : {$data['phone']}" : null,
                "Compte ouvert depuis {$data['tenure_days']} jour".($data['tenure_days'] > 1 ? 's' : ''),
            ])->filter()->implode(' · '),
            'score' => $data['score'],
            'verdictBadge' => $data['verdict_badge'],
            'breakdown' => array_map(fn (array $item) => [
                'label' => $item['label'],
                'points' => $count((int) round($item['points'])),
                'max' => $count((int) round($item['max'])),
            ], $data['breakdown']),
            'activity' => [
                'entries_count' => $count($data['activity']['entries_count']),
                'total_income' => $money($data['activity']['total_income']),
                'total_expense' => $money($data['activity']['total_expense']),
                'net_profit' => $money($data['activity']['net_profit']),
                'avg_daily_income' => $money($data['activity']['avg_daily_income']),
            ],
            'vault' => [
                'balance' => $money($data['vault']['balance']),
                'total_deposits' => $money($data['vault']['total_deposits']),
                'total_withdrawals' => $money($data['vault']['total_withdrawals']),
                'movements_count' => $count($data['vault']['movements_count']),
            ],
            'tontine' => [
                'groups_joined' => $count($data['tontine']['groups_joined']),
                'contributions_count' => $count($data['tontine']['contributions_count']),
                'total_contributed' => $money($data['tontine']['total_contributed']),
                'total_received' => $money($data['tontine']['total_received']),
            ],
            'narrative' => $data['narrative'],
        ]);

        $filename = 'dossier-financier-'.Str::slug($company->name).'-'.now()->format('Ymd').'.pdf';

        return $pdf->download($filename);
    }
}
