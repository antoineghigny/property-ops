import { clamp, round } from '../shared/utils.mjs';

function availabilityScoreFromEvidence(analysis) {
  const buckets = [
    ...Object.values(analysis.property_facts || {}),
    ...Object.values(analysis.market_context || {}),
    ...Object.values(analysis.policy_context || {}),
    ...Object.values(analysis.lender_assumptions || {}),
  ].filter(Boolean);

  if (buckets.length === 0) return 0;
  let observed = 0;
  for (const evidence of buckets) {
    if (evidence.value !== null && evidence.value !== undefined && evidence.manual_review_required !== true) observed += 1;
  }
  return (observed / buckets.length) * 100;
}

export function scoreCase(caseData, analysis) {
  const pricing = analysis.derived_metrics.pricing;
  const asking = pricing.asking_price || 0;
  const intrinsicValue = pricing.intrinsic_value_estimate || 0;
  
  const debtRatio = analysis.derived_metrics.finance.financeability.debt_ratio_pct ?? 100;
  const remainingIncome = analysis.derived_metrics.finance.financeability.remaining_income ?? 0;
  const financeVerdict = analysis.derived_metrics.finance.financeability.verdict || 'unknown';
  const immediateWorks = analysis.derived_metrics.works.immediate_works_estimate || 0;
  const label = String(caseData.energy?.label || '').toUpperCase();
  const manualReviewCount = analysis.manual_reviews.length;
  const missingDocCount = analysis.documents?.missing?.length || 0;
  const profileReady = analysis.profile_status?.is_finance_ready === true;

  // DEAL SCORE : Basé sur l'écart vs Valeur Intrinsèque (m2 + PEB)
  const gapPct = pricing.relative_market_gap_pct;
  const dealScore = clamp(round(
    (gapPct <= -20 ? 95  // En dessous de 20% de la valeur : pépite
      : gapPct <= -10 ? 85 // En dessous de 10% : bon deal
        : gapPct <= 5 ? 70  // Prix de marché
          : 30)             // Trop cher
    + (caseData.typology.property_kind === 'house' ? 5 : 0)
    - (immediateWorks > 40000 ? 15 : 0),
  0), 0, 100);

  const financeFitScore = profileReady
    ? (financeVerdict === 'unknown'
      ? 0
      : clamp(round(
        (debtRatio <= 35 ? 90
          : debtRatio <= 40 ? 75
            : debtRatio <= 45 ? 55
              : 25)
        + (remainingIncome >= 1600 ? 10 : remainingIncome >= 1200 ? 5 : -10),
      0), 0, 100))
    : 0;

  const riskScore = clamp(round(
    90
    - (['F', 'G'].includes(label) ? 25 : ['D', 'E'].includes(label) ? 10 : 0)
    - (manualReviewCount * 3)
    - (immediateWorks > 50000 ? 10 : 0),
  0), 0, 100);

  const dataConfidenceScore = clamp(round(
    availabilityScoreFromEvidence(analysis)
    - (caseData.identity.identity_confidence === 'low' ? 20 : caseData.identity.identity_confidence === 'unknown' ? 35 : 0),
  0), 0, 100);

  const executionScore = clamp(round(
    90
    - (missingDocCount * 3)
    - (manualReviewCount * 4)
    - (immediateWorks > 30000 ? 10 : 0),
  0), 0, 100);

  return {
    deal_score: dealScore,
    finance_fit_score: financeFitScore,
    risk_score: riskScore,
    data_confidence_score: dataConfidenceScore,
    execution_score: executionScore,
    why: {
      deal_score: [
        `Analysis based on intrinsic value: ${intrinsicValue} € (based on m2 and PEB).`,
        gapPct < 0 ? `Asking price is ${Math.abs(gapPct)}% BELOW the estimated segment value.` : `Asking price is ${gapPct}% ABOVE the estimated segment value.`,
      ],
      finance_fit_score: [
        profileReady
          ? `Debt ratio baseline: ${round(debtRatio, 1)}%.`
          : 'Borrower profile is not configured.',
      ],
    },
  };
}
