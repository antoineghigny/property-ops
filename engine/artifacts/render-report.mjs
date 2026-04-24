import { renderTemplate } from '../shared/render.mjs';
import { formatCurrency, round } from '../shared/utils.mjs';

export function renderReport(caseData, analysis) {
  const pricing = analysis.derived_metrics.pricing;
  const finance = analysis.derived_metrics.finance;
  
  return renderTemplate('report.md.hbs', {
    caseId: caseData.case_id,
    generatedAt: analysis.generated_at,
    decision: analysis.decisions,
    scores: analysis.scores,
    acquisitionCostLines: [
      { label: 'Prix d\'achat', value: formatCurrency(finance.acquisition_costs.purchase_price) },
      { label: 'Droits d\'enregistrement', value: formatCurrency(finance.acquisition_costs.registration_duties) },
      { label: 'Frais d\'acte d\'achat (est.)', value: formatCurrency(finance.acquisition_costs.purchase_deed_cost_estimate) },
      { label: 'Frais d\'acte d\'hypothèque (est.)', value: formatCurrency(finance.acquisition_costs.mortgage_deed_cost_estimate) },
      { label: 'Travaux immédiats', value: formatCurrency(finance.acquisition_costs.immediate_works) },
      { label: 'Réserve d\'imprévus', value: formatCurrency(finance.acquisition_costs.contingency_reserve) },
      { label: 'Coût total du projet', value: formatCurrency(finance.acquisition_costs.total_project_cost) },
    ],
    marketLines: pricing.summary_lines,
    financeLines: finance.summary_lines,
    riskLines: [
      { label: 'Label PEB', value: caseData.energy?.label || 'Inconnu' },
      { label: 'Révisions manuelles', value: String(analysis.manual_reviews.length) },
      { label: 'Verdict Bancaire', value: finance.financeability.verdict },
      { label: 'Statut Profil Emprunteur', value: analysis.profile_status?.status || 'Incomplet' },
    ],
    nextSteps: analysis.next_steps,
  });
}
