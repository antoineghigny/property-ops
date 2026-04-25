import { formatCurrency, round } from '../shared/utils.mjs';

export function analyzeMarket(caseData, marketReference) {
  const askingPrice = caseData.economics.asking_price || null;
  const livingArea = caseData.typology.living_area_m2 || 0;
  
  let baseM2Price = caseData.meta?.market_m2_price || marketReference?.price_per_m2 || null;
  let sourceNote = caseData.meta?.market_m2_price ? 'Real-time Web Research' : 'Official Market Statistics';
  const medianTotal = marketReference?.p50 || null;

  if (!baseM2Price && livingArea > 0 && medianTotal) {
    const averageReferenceArea = caseData.typology.property_kind === 'apartment' ? 85 : 115;
    baseM2Price = medianTotal / averageReferenceArea;
    sourceNote = `Derived from Municipal Median (${formatCurrency(medianTotal)})`;
  }

  let intrinsicValue = null;
  let manualReviewRequired = !baseM2Price;

  if (baseM2Price && livingArea > 0) {
    const energyLabel = caseData.energy?.label || 'Unknown';
    let energyBonus = 1.0;
    
    if (['A', 'B'].includes(energyLabel)) energyBonus = 1.15;
    else if (['F', 'G'].includes(energyLabel)) energyBonus = 0.85;

    const adjustedM2Price = baseM2Price * energyBonus;
    intrinsicValue = livingArea * adjustedM2Price;
  }

  const askingPricePerM2 = askingPrice && livingArea > 0 ? askingPrice / livingArea : 0;
  const absoluteGap = askingPrice && intrinsicValue ? askingPrice - intrinsicValue : 0;
  const relativeGapPct = (askingPrice && intrinsicValue && intrinsicValue > 0) 
    ? ((askingPrice - intrinsicValue) / intrinsicValue) * 100 
    : 0;

  return {
    asking_price: askingPrice,
    asking_price_per_m2: askingPricePerM2,
    intrinsic_value_estimate: intrinsicValue,
    intrinsic_value_per_m2: baseM2Price,
    valuation_source: sourceNote,
    relative_market_gap_pct: round(relativeGapPct, 1),
    manual_review_required: manualReviewRequired,
    
    target_price: intrinsicValue,
    rational_max_price: intrinsicValue ? intrinsicValue * 1.10 : null,
    comfortable_max_price: intrinsicValue ? intrinsicValue * 0.95 : null,
    aggressive_max_price: intrinsicValue ? intrinsicValue * 1.05 : null,
    
    margin_of_safety_eur: intrinsicValue ? round(-absoluteGap, 0) : null,
    margin_of_safety_pct: intrinsicValue ? round(-relativeGapPct, 1) : null,
    
    summary_lines: [
      { label: 'Asking Price', value: formatCurrency(askingPrice) },
      { label: 'Price per m2', value: askingPricePerM2 ? `${round(askingPricePerM2, 0)} €/m²` : 'Unknown' },
      { label: 'Intrinsic Value Est.', value: intrinsicValue ? formatCurrency(intrinsicValue) : 'Manual Review Required' },
      { label: 'Valuation Methodology', value: sourceNote },
      { label: 'Market Gap', value: intrinsicValue ? `${round(relativeGapPct, 1)}%` : 'Insufficient Data' }
    ],
  };
}
