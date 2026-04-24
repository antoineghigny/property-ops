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
  
  // CRITICAL HUNTER MODE: Aggressive coefficients for old/unknown stock
  const rules = constructionPack?.rules || {
    light_refresh: { low_per_m2: 150, high_per_m2: 300 }, // Was 75-150
    functional_upgrade: { low_per_m2: 400, high_per_m2: 650 }, // Was 250-450
    energy_upgrade_standard: { low_per_m2: 250, high_per_m2: 500 },
    energy_upgrade_heavy: { low_per_m2: 500, high_per_m2: 1000 },
    heavy_renovation_standard: { low_per_m2: 800, high_per_m2: 1200 },
    heavy_renovation_old_building: { low_per_m2: 1200, high_per_m2: 2000 }, // Realistic full overhaul
  };

  const light = band(area, rules.light_refresh.low_per_m2, rules.light_refresh.high_per_m2);
  const functional = band(area, rules.functional_upgrade.low_per_m2, rules.functional_upgrade.high_per_m2);
  
  const isHeavyEnergy = ['E', 'F', 'G'].includes(label);
  const energy = isHeavyEnergy 
    ? band(area, rules.energy_upgrade_heavy.low_per_m2, rules.energy_upgrade_heavy.high_per_m2)
    : band(area, rules.energy_upgrade_standard.low_per_m2, rules.energy_upgrade_standard.high_per_m2);
    
  const isOldBuilding = condition === 'old' || condition === 'unknown';
  const heavy = isOldBuilding
    ? band(area, rules.heavy_renovation_old_building.low_per_m2, rules.heavy_renovation_old_building.high_per_m2)
    : band(area, rules.heavy_renovation_standard.low_per_m2, rules.heavy_renovation_standard.high_per_m2);

  // Pessimistic allocation: always pick the higher need
  const immediate = ['E', 'F', 'G'].includes(label) ? energy.central : functional.central;
  const within12Months = isOldBuilding ? heavy.low : functional.central;

  return {
    packages: {
      light_refresh: {
        ...light,
        assumptions: ['Cosmetic refresh only.'],
        confidence: 'low',
      },
      functional_upgrade: {
        ...functional,
        assumptions: ['Kitchen, sanitary, or system refresh without structural works.'],
        confidence: 'low',
      },
      energy_upgrade: {
        ...energy,
        assumptions: ['Envelope, heating, or glazing upgrades based on energy label.'],
        confidence: isHeavyEnergy ? 'medium' : 'low',
      },
      heavy_renovation: {
        ...heavy,
        assumptions: ['Large-scale interior or technical overhaul.'],
        confidence: 'low',
      },
    },
    immediate_works_estimate: immediate,
    works_12_months_estimate: within12Months,
    manual_review_required: true,
    notes: [
      'HUNTER MODE: Provisions are highly aggressive to account for hidden technical debt.',
      'Professional quotes remain required before final commitment.',
    ],
  };
}
