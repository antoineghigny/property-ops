import { round } from '../shared/utils.mjs';

function band(area, lowPerM2, highPerM2) {
  if (!area || !lowPerM2 || !highPerM2) return { low: null, central: null, high: null };
  return {
    low: round(area * lowPerM2, 0),
    central: round(area * ((lowPerM2 + highPerM2) / 2), 0),
    high: round(area * highPerM2, 0),
  };
}

export function estimateWorks(caseData, constructionPack) {
  const area = caseData.typology.living_area_m2 || 0;
  const label = String(caseData.energy?.label || '').toUpperCase();
  const condition = caseData.typology.condition_kind || 'unknown';
  const description = (caseData.listing?.raw_description || '').toLowerCase();
  
  // DYNAMIC RATES HIERARCHY
  // 1. Injected by Agent research (meta.construction_rates)
  // 2. Official Pack data (constructionPack)
  // 3. Fallback (Conservative historical defaults)
  const metaRates = caseData.meta?.construction_rates || {};
  const packRules = constructionPack?.rules || {};

  // IA-PROOF LOGIC: If AI injected a string instead of an object, use it as a tier selector
  let forcedTier = null;
  if (typeof metaRates === 'string') {
    forcedTier = metaRates;
  }

  const rules = {
    light: metaRates.refresh || packRules.light_refresh?.low_per_m2 || 350,
    light_high: metaRates.refresh_high || packRules.light_refresh?.high_per_m2 || 800,
    complete: metaRates.complete || packRules.functional_upgrade?.low_per_m2 || 1000,
    complete_high: metaRates.complete_high || packRules.functional_upgrade?.high_per_m2 || 1800,
    structural: metaRates.structural || packRules.heavy_renovation_structural?.low_per_m2 || 1800,
    structural_high: metaRates.structural_high || packRules.heavy_renovation_structural?.high_per_m2 || 3000,
  };

  const light = band(area, rules.light, rules.light_high);
  const functional = band(area, rules.complete, rules.complete_high);
  const structural = band(area, rules.structural, rules.structural_high);

  // LOGIQUE DE DÉCISION (BASÉE SUR L'ÉTAT, LA DESCRIPTION ET LE PEB)
  const isHeavyEnergy = ['E', 'F', 'G'].includes(label);
  const looksStructural = description.includes('gros oeuvre') || description.includes('parachever') || description.includes('nue') || description.includes('stripped');
  const isStructuralNeed = condition === 'structural_renovation' || condition === 'ruin' || looksStructural || forcedTier === 'structural';
  
  // Selection of the most prudent band
  let immediate = light.central;
  if (isStructuralNeed) immediate = structural.central;
  else if (isHeavyEnergy || forcedTier === 'complete') immediate = functional.central;

  const within12Months = isStructuralNeed ? structural.high : (isHeavyEnergy ? functional.high : light.central);

  return {
    packages: {
      light_refresh: light,
      functional_upgrade: functional,
      heavy_renovation: structural,
    },
    immediate_works_estimate: immediate,
    works_12_months_estimate: within12Months,
    manual_review_required: true,
    notes: [
      `Estimation based on ${metaRates.refresh ? 'Real-time Market Research' : 'Regional Baseline Packs'}.`,
      'Professional onsite inspection is mandatory before final commitment.',
    ],
  };
}
