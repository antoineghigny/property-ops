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
  const intrinsicValue = pricing.intrinsic_value_estimate || 0;
  
  const financeMetrics = analysis.derived_metrics.finance;
  const financeability = financeMetrics.financeability;
  const debtRatio = financeability.debt_ratio_pct ?? 100;
  const remainingIncome = financeability.remaining_income ?? 0;
  const financeVerdict = financeability.verdict || 'unknown';
  
  // DYNAMIC THRESHOLDS from Lender Packs & Strategy
  const dtiLimit = financeability.lender_debt_limit_pct || 40;
  const incomeFloor = financeability.remaining_income_floor || 1200;

  const immediateWorks = analysis.derived_metrics.works.immediate_works_estimate || 0;
  const label = String(caseData.energy?.label || '').toUpperCase();
  const manualReviewCount = analysis.manual_reviews.length;
  const missingDocCount = analysis.documents?.missing?.length || 0;
  const profileReady = analysis.profile_status?.is_finance_ready === true;

  // 1. DEAL SCORE (Market Gap based)
  const gapPct = pricing.relative_market_gap_pct;
  const dealScore = clamp(round(
    (gapPct <= -20 ? 95 
      : gapPct <= -10 ? 85 
        : gapPct <= 5 ? 70 
          : 30)
    + (caseData.typology.property_kind === 'house' ? 5 : 0)
    - (immediateWorks > 50000 ? 15 : 0),
  0), 0, 100);

  // 2. FINANCE FIT SCORE (Dynamic relative to thresholds)
  const financeFitScore = profileReady
    ? (financeVerdict === 'unknown'
      ? 0
      : clamp(round(
        (debtRatio <= dtiLimit - 5 ? 90
          : debtRatio <= dtiLimit ? 75
            : debtRatio <= dtiLimit + 5 ? 50
              : 20)
        + (remainingIncome >= incomeFloor + 400 ? 10 : remainingIncome >= incomeFloor ? 5 : -15),
      0), 0, 100))
    : 0;

  // 3. RISK SCORE
  const riskScore = clamp(round(
    90
    - (['F', 'G'].includes(label) ? 25 : ['D', 'E'].includes(label) ? 10 : 0)
    - (manualReviewCount * 3)
    - (immediateWorks > 75000 ? 15 : 0),
  0), 0, 100);

  // 4. DATA CONFIDENCE SCORE
  const dataConfidenceScore = clamp(round(
    availabilityScoreFromEvidence(analysis)
    - (caseData.identity.identity_confidence === 'low' ? 20 : caseData.identity.identity_confidence === 'unknown' ? 35 : 0),
  0), 0, 100);

  // 5. EXECUTION SCORE
  const executionScore = clamp(round(
    90
    - (missingDocCount * 3)
    - (manualReviewCount * 4)
    - (immediateWorks > 50000 ? 15 : 0),
  0), 0, 100);

  return {
    deal_score: dealScore,
    finance_fit_score: financeFitScore,
    risk_score: riskScore,
    data_confidence_score: dataConfidenceScore,
    execution_score: executionScore,
    why: {
      deal_score: [
        `Intrinsic value established at ${intrinsicValue} €.`,
        gapPct < 0 ? `Property is trading ${Math.abs(gapPct)}% BELOW intrinsic value.` : `Property is trading ${gapPct}% ABOVE intrinsic value.`,
      ],
      finance_fit_score: [
        profileReady
          ? `Debt ratio is ${round(debtRatio, 1)}% against a ${dtiLimit}% limit.`
          : 'Borrower profile is incomplete.',
      ],
    },
  };
}
