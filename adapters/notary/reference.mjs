import { nowIso } from '../../engine/shared/utils.mjs';

export function buildNotaryReferenceEvidence() {
  return {
    purchase_calculator: {
      value: 'https://www.notaire.be/calculateurs/immobilier/calcul-de-frais-dacte-dachat-dun-bien-immobilier-et/ou-dun-terrain-batir',
      source_name: 'Notaire purchase deed calculator',
      source_url: 'https://www.notaire.be/calculateurs/immobilier/calcul-de-frais-dacte-dachat-dun-bien-immobilier-et/ou-dun-terrain-batir',
      source_type: 'html',
      scope: 'official',
      retrieved_at: nowIso(),
      confidence: 'high',
      manual_review_required: true,
      notes: ['Use the official calculator to refine ancillary deed costs before offer signature.'],
    },
    mortgage_calculator: {
      value: 'https://www.notaire.be/calculateurs/immobilier/calcul-de-frais-dacte-de-credit-hypothecaire',
      source_name: 'Notaire mortgage deed calculator',
      source_url: 'https://www.notaire.be/calculateurs/immobilier/calcul-de-frais-dacte-de-credit-hypothecaire',
      source_type: 'html',
      scope: 'official',
      retrieved_at: nowIso(),
      confidence: 'high',
      manual_review_required: true,
      notes: ['Use the official calculator to refine mortgage deed costs.'],
    },
  };
}
