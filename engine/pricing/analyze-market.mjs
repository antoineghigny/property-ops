import { formatCurrency, round } from '../shared/utils.mjs';

/**
 * DEEP MARKET ANALYSIS
 * Replaces simplistic median comparison with segmented analysis (m2, Typology, EPC).
 * Uses a strict hierarchy of data sources to avoid hardcoded suppositions.
 */
export function analyzeMarket(caseData, marketReference) {
  const askingPrice = caseData.economics.asking_price || null;
  const livingArea = caseData.typology.living_area_m2 || 0;
  
  // DATA HIERARCHY FOR MARKET PRICE PER M2
  // 1. Agent Web Research (Top Priority)
  // 2. Official Market Reference (Statbel/Notary)
  // 3. Fallback to null (Manual review required)
  let baseM2Price = caseData.meta?.market_m2_price || marketReference?.price_per_m2 || null;
  const medianAbs = marketReference?.p50 || null;

  let manualReviewRequired = false;
  let intrinsicValue = null;

  if (baseM2Price && livingArea > 0) {
    // Apply segmented adjustments
    const energyLabel = caseData.energy?.label || 'Unknown';
    let energyBonus = 1.0;
    
    // EPC Premium Logic (Region-agnostic principles)
    if (['A', 'B'].includes(energyLabel)) energyBonus = 1.15;
    else if (['F', 'G'].includes(energyLabel)) energyBonus = 0.85;

    const adjustedM2Price = baseM2Price * energyBonus;
    intrinsicValue = livingArea * adjustedM2Price;
  } else if (medianAbs) {
    // If we only have global median for the area, use it as a rough baseline
    intrinsicValue = medianAbs;
    manualReviewRequired = true;
  } else {
    // No data found. DO NOT INVENT.
    intrinsicValue = null;
    manualReviewRequired = true;
  }

  // COMPARISON METRICS
  const askingPricePerM2 = askingPrice && livingArea > 0 ? askingPrice / livingArea : 0;
  const absoluteGap = askingPrice && intrinsicValue ? askingPrice - intrinsicValue : 0;
  const relativeGapPct = (askingPrice && intrinsicValue && intrinsicValue > 0) 
    ? ((askingPrice - intrinsicValue) / intrinsicValue) * 100 
    : 0;

  // TARGET PRICES
  const targetPrice = intrinsicValue;
  const rationalMaxPrice = intrinsicValue ? intrinsicValue * 1.10 : null;
  
  return {
    asking_price: askingPrice,
    asking_price_per_m2: askingPricePerM2,
    intrinsic_value_estimate: intrinsicValue,
    intrinsic_value_per_m2: baseM2Price,
    local_median_price: medianAbs,
    relative_market_gap_pct: round(relativeGapPct, 1),
    manual_review_required: manualReviewRequired,
    
    // Guardrails
    target_price: targetPrice,
    rational_max_price: rationalMaxPrice,
    comfortable_max_price: intrinsicValue ? intrinsicValue * 0.95 : null,
    aggressive_max_price: intrinsicValue ? intrinsicValue * 1.05 : null,
    
    margin_of_safety_eur: intrinsicValue ? round(-absoluteGap, 0) : null,
    margin_of_safety_pct: intrinsicValue ? round(-relativeGapPct, 1) : null,
    
    summary_lines: [
      { label: 'Asking Price', value: formatCurrency(askingPrice) },
      { label: 'Price per m2', value: askingPricePerM2 ? `${round(askingPricePerM2, 0)} €/m²` : 'Unknown' },
      { label: 'Intrinsic Value Est.', value: intrinsicValue ? formatCurrency(intrinsicValue) : 'Manual Review Required' },
      { label: 'Market Gap', value: intrinsicValue ? `${round(relativeGapPct, 1)}%` : 'Insufficient Data' },
      { label: 'Negotiation Target', value: intrinsicValue ? formatCurrency(targetPrice) : 'TBD' }
    ],
  };
}
