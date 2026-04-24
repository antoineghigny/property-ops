import { nowIso } from '../../engine/shared/utils.mjs';

export function buildEnergyLookupEvidence(caseData) {
  const region = caseData.identity.region;
  const certificateNumber = caseData.energy?.certificate_number || null;
  const rawAddress = caseData.identity.raw_address || caseData.identity.normalized_address || null;

  if (region === 'BRU') {
    return {
      value: {
        registry_url: 'https://www.peb-epb.brussels/certificats-certificaten/',
        certificate_number: certificateNumber,
        address_hint: rawAddress,
      },
      source_name: 'Brussels PEB registry',
      source_url: 'https://environnement.brussels/pro/documentation-et-outils/sites-web-et-outils-interactifs/le-registre-des-certificats-peb-des-logements-bruxellois',
      source_type: 'html',
      scope: 'official',
      retrieved_at: nowIso(),
      confidence: certificateNumber ? 'high' : 'medium',
      manual_review_required: true,
      notes: ['Use the public registry to confirm certificate validity and energy indicator.'],
    };
  }

  if (region === 'WAL') {
    return {
      value: {
        registry_url: 'https://registrepeb.be/#/',
        certificate_number: certificateNumber,
      },
      source_name: 'Wallonia PEB registry',
      source_url: 'https://energie.wallonie.be/home/performance-energetuique-des-batiments/batiments-residentiels/achat-vente-location/registre-des-certificats-peb.html',
      source_type: 'html',
      scope: 'official',
      retrieved_at: nowIso(),
      confidence: certificateNumber ? 'high' : 'low',
      manual_review_required: true,
      notes: ['Wallonia reserves the lookup to certificate-number-based consultation.'],
    };
  }

  if (region === 'VLG') {
    return {
      value: {
        guidance_url: 'https://www.vlaanderen.be/een-huis-of-appartement-kopen/renovatieverplichting-voor-residentiele-gebouwen',
        declared_label: caseData.energy?.label || null,
      },
      source_name: 'Flanders renovation obligation reference',
      source_url: 'https://www.vlaanderen.be/een-huis-of-appartement-kopen/renovatieverplichting-voor-residentiele-gebouwen',
      source_type: 'html',
      scope: 'official',
      retrieved_at: nowIso(),
      confidence: caseData.energy?.label ? 'medium' : 'low',
      manual_review_required: true,
      notes: ['Cross-check the declared EPC label with the official Flemish energy workflow before final commitment.'],
    };
  }

  return null;
}
