export function makeDecision(caseData, analysis) {
  const scores = analysis.scores;
  const pricing = analysis.derived_metrics.pricing;
  const finance = analysis.derived_metrics.finance;
  const redFlags = [];
  const dealBreakers = [];

  // CRITICAL FEASIBILITY CHECKS
  const assetGap = finance.capital_requirements?.asset_gap || 0;
  const isValueTrap = finance.acquisition_costs?.is_value_trap || false;
  const isFinanceableAsHome = finance.financeability.verdict !== 'not_financeable';
  const hasRentalPotential = (finance.scenarios?.partial_rent_recognition?.debt_ratio_pct || 100) < 45;

  if (assetGap > 0) {
    dealBreakers.push(`INSUFFICIENT LIQUIDITY: You are missing ${assetGap} € in total assets to cover fees and downpayment.`);
  }

  if (isValueTrap) {
    dealBreakers.push(`VALUE TRAP: Total project cost per m2 exceeds market value by >15%. Economic loss is certain.`);
  }

  if (!isFinanceableAsHome && !hasRentalPotential) {
    dealBreakers.push('Baseline financing scenario is not financeable and rental income does not close the gap.');
  } else if (!isFinanceableAsHome && hasRentalPotential) {
    redFlags.push('CRITICAL: Unfinanceable as a primary residence, but STABLE as an investment (with rental income).');
  }
  
  if (finance.capital_requirements?.requires_securities_liquidation) {
    redFlags.push('NOTE: Project requires liquidating some securities/investments to cover the cash gap.');
  }

  // DÉTERMINATION DU VERDICT
  let verdict = 'look_closer';
  let band = 'weak';

  if (dealBreakers.length > 0) {
    verdict = 'ignore';
    band = 'bad';
  } else if (scores.deal_score >= 80 && !isFinanceableAsHome && hasRentalPotential) {
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
    ? 'DO NOT PROCEED. The project is economically unsound or financially unreachable.'
    : (verdict === 'negotiate' && !isFinanceableAsHome && hasRentalPotential)
      ? 'High potential deal! But you MUST pivot to an investment strategy and potentially liquidate some securities.'
      : 'Continue with due diligence (visit or documents).';

  return {
    verdict,
    recommendation_band: band,
    deal_breakers: dealBreakers,
    red_flags: redFlags,
    decisions: {
      must_request_docs: verdict !== 'ignore',
      must_visit: ['visit', 'negotiate', 'prepare_bank'].includes(verdict),
      next_best_action: nextBestAction,
      comfortable_max_price: pricing.comfortable_max_price,
      aggressive_max_price: pricing.aggressive_max_price,
    },
  };
}
