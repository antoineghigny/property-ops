export function makeDecision(caseData, analysis) {
  const scores = analysis.scores;
  const pricing = analysis.derived_metrics.pricing;
  const finance = analysis.derived_metrics.finance;
  const redFlags = [];
  const dealBreakers = [];
  const profileReady = analysis.profile_status?.is_finance_ready === true;

  if ((caseData.identity.identity_confidence || 'unknown') === 'unknown') {
    redFlags.push('Property identity is not resolved.');
  }
  if (!profileReady) {
    redFlags.push('Borrower profile is incomplete.');
  }
  
  // NOUVELLE LOGIQUE : Analyse profonde du financement
  const isFinanceableAsHome = finance.financeability.verdict !== 'not_financeable';
  const hasRentalPotential = (finance.scenarios?.partial_rent_recognition?.debt_ratio_pct || 100) < 45;
  const hasAssetLiquidity = finance.capital_requirements?.requires_securities_liquidation === true;

  if (!isFinanceableAsHome && !hasRentalPotential) {
    dealBreakers.push('Baseline financing scenario is not financeable and rental income does not close the gap.');
  } else if (!isFinanceableAsHome && hasRentalPotential) {
    redFlags.push('CRITICAL: Unfinanceable as a primary residence, but STABLE as an investment (with rental income).');
  }
  
  if (hasAssetLiquidity) {
    redFlags.push('NOTE: Project requires liquidating some securities/investments to cover the cash gap.');
  }

  if (pricing.relative_market_gap_pct > 15) {
    redFlags.push('Asking price is materially above intrinsic value estimate.');
  }

  // DÉTERMINATION DU VERDICT
  let verdict = 'look_closer';
  let band = 'weak';

  if (dealBreakers.length > 0) {
    verdict = 'ignore';
    band = 'bad';
  } else if (scores.deal_score >= 80 && !isFinanceableAsHome && hasRentalPotential) {
    // SCÉNARIO GOSSELIES : Super deal, investissement possible
    verdict = 'negotiate';
    band = 'interesting';
  } else if (scores.deal_score >= 75 && isFinanceableAsHome && scores.finance_fit_score >= 70) {
    verdict = 'prepare_bank';
    band = 'strong';
  } else if (scores.deal_score >= 60) {
    verdict = 'visit';
    band = 'interesting';
  }

  const nextBestAction = verdict === 'ignore'
    ? 'Drop the case or reduce the target price materially.'
    : (verdict === 'negotiate' && !isFinanceableAsHome && hasRentalPotential)
      ? 'High potential deal! But you MUST pivot to an investment strategy (including rental income) and potentially liquidate some securities to be bankable.'
      : 'Continue with due diligence (visit or documents).';

  return {
    verdict,
    recommendation_band: band,
    should_ignore: verdict === 'ignore',
    should_visit: ['visit', 'negotiate', 'prepare_offer', 'prepare_bank'].includes(verdict),
    should_offer: ['prepare_offer', 'prepare_bank'].includes(verdict),
    should_bank: verdict === 'prepare_bank',
    must_request_docs: true,
    manual_review_required: analysis.manual_reviews.length > 0,
    next_best_action: nextBestAction,
    red_flags: redFlags,
    deal_breaker_flags: dealBreakers,
    price_guardrails: {
      target_price: pricing.target_price,
      rational_max_price: pricing.rational_max_price,
      comfortable_max_price: pricing.comfortable_max_price,
      aggressive_max_price: pricing.aggressive_max_price,
      margin_of_safety_eur: pricing.margin_of_safety_eur,
      margin_of_safety_pct: pricing.margin_of_safety_pct,
    },
  };
}
