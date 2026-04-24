import { loadProfileWithStatus, loadStrategy, loadLenders } from '../shared/config.mjs';
import { loadBelgiumRegionPacks, loadLenderPack, loadConstructionPack } from '../shared/packs.mjs';
import { buildEnergyLookupEvidence } from '../../adapters/energy/registry-lookups.mjs';
import { getMunicipalityMarketContext } from '../../adapters/market/statbel-market.mjs';
import { buildNotaryReferenceEvidence } from '../../adapters/notary/reference.mjs';
import { formatCurrency, nowIso, round, dedupe } from '../shared/utils.mjs';
import { analyzeMarket } from '../pricing/analyze-market.mjs';
import { estimateWorks } from '../works/estimate-works.mjs';
import { calculateFinance } from '../finance/calculate-finance.mjs';
import { scoreCase } from '../decision-engine/score-case.mjs';
import { makeDecision } from '../decision-engine/make-decision.mjs';

function basicPropertyEvidence(caseData) {
  const sourceName = caseData.source.portal === 'manual' ? 'Manual case input' : 'Listing extraction';
  const sourceType = caseData.source.portal === 'manual' ? 'manual' : 'html';
  const sourceUrl = caseData.source.listing_url || 'manual://case';
  const retrievedAt = caseData.source.collected_at || nowIso();

  return {
    asking_price: {
      value: caseData.economics.asking_price ?? null,
      unit: 'EUR',
      source_name: sourceName,
      source_url: sourceUrl,
      source_type: sourceType,
      scope: 'informational',
      retrieved_at: retrievedAt,
      confidence: caseData.economics.asking_price ? 'high' : 'unknown',
    },
    living_area_m2: {
      value: caseData.typology.living_area_m2 ?? null,
      unit: 'm2',
      source_name: sourceName,
      source_url: sourceUrl,
      source_type: sourceType,
      scope: 'informational',
      retrieved_at: retrievedAt,
      confidence: caseData.typology.living_area_m2 ? 'medium' : 'unknown',
    },
    energy_label: {
      value: caseData.energy?.label ?? null,
      source_name: sourceName,
      source_url: sourceUrl,
      source_type: sourceType,
      scope: 'informational',
      retrieved_at: retrievedAt,
      confidence: caseData.energy?.label ? 'medium' : 'unknown',
    },
  };
}

function policyEvidenceFromPacks(regionPacks) {
  const evidence = {};
  for (const pack of regionPacks) {
    if (pack.kind === 'registration_duties') {
      evidence.registration_duties_pack = {
        value: pack.rules,
        source_name: pack.source_name || pack.pack_id,
        source_url: pack.source_url || 'pack://registration_duties',
        source_type: 'pdf',
        scope: 'official',
        retrieved_at: nowIso(),
        effective_from: pack.effective_from,
        confidence: 'high',
      };
    }
    if (pack.kind === 'energy') {
      evidence.energy_policy_pack = {
        value: pack.rules,
        source_name: pack.source_name || pack.pack_id,
        source_url: pack.source_url || 'pack://energy',
        source_type: 'html',
        scope: 'official',
        retrieved_at: nowIso(),
        effective_from: pack.effective_from,
        confidence: 'high',
      };
    }
    if (pack.kind === 'rent') {
      evidence.rent_policy_pack = {
        value: pack.rules,
        source_name: pack.source_name || pack.pack_id,
        source_url: pack.source_url || 'pack://rent',
        source_type: 'html',
        scope: 'official',
        retrieved_at: nowIso(),
        effective_from: pack.effective_from,
        confidence: 'high',
      };
    }
  }
  return evidence;
}

function lenderEvidence(lenderPack) {
  return {
    lender_policy_pack: {
      value: lenderPack?.rules || null,
      source_name: lenderPack?.source_name || lenderPack?.pack_id || 'Unknown lender policy',
      source_url: lenderPack?.source_url || 'pack://lender',
      source_type: 'html',
      scope: 'market_practice',
      retrieved_at: nowIso(),
      effective_from: lenderPack?.effective_from,
      confidence: lenderPack ? 'medium' : 'unknown',
      notes: ['Lender-policy packs model practice assumptions, not legal obligations.'],
    },
  };
}

export async function enrichCase(caseData) {
  const { profile, status: profileStatus } = loadProfileWithStatus();
  const strategy = loadStrategy();
  const lenders = loadLenders();
  const selectedLenderId = strategy.strategy.mode === 'yield'
    ? 'be-default-investment'
    : lenders.selected_default_lender;
  const lenderPack = loadLenderPack(selectedLenderId);
  const constructionPack = loadConstructionPack('be-standard');
  const regionPacks = caseData.identity.country === 'BE' && caseData.identity.region
    ? loadBelgiumRegionPacks(caseData.identity.region)
    : [];

  // DEEP RESEARCH MANDATE: Identify specific local economic drivers
  const postcode = caseData.identity.postcode || '';
  const municipality = caseData.identity.municipality || '';
  
  const marketReference = await getMunicipalityMarketContext({
    municipality,
    postcode,
    propertyKind: caseData.typology.property_kind,
    facadesCount: caseData.typology.facades_count,
  });

  const pricing = analyzeMarket(caseData, marketReference);
  const works = estimateWorks(caseData, constructionPack);
  const finance = calculateFinance(caseData, { ...profile, status: profileStatus }, strategy, regionPacks, lenderPack, pricing, works);

  const documents = {
    required_by_law: dedupe([
      'identity_card',
      'listing_or_offer',
      'energy_certificate',
      caseData.typology.condominium ? 'condominium_documents' : null,
    ]),
    required_by_lender: dedupe(lenderPack?.rules?.required_documents || []),
    recommended: dedupe([
      'bank_statements',
      'savings_proof',
      'works_quotes',
      caseData.typology.condominium ? 'agm_minutes' : null,
      strategy.strategy.future_rental_goal ? 'rent_scenario_justification' : null,
    ]),
  };
  documents.missing = dedupe([...documents.required_by_law, ...documents.required_by_lender]);

  const propertyFacts = basicPropertyEvidence(caseData);
  const policyContext = policyEvidenceFromPacks(regionPacks);
  const lenderAssumptions = lenderEvidence(lenderPack);
  const energyLookup = buildEnergyLookupEvidence(caseData);
  if (energyLookup) {
    propertyFacts.energy_registry_lookup = energyLookup;
  }

  const marketContext = marketReference ? {
    municipality_market_reference: {
      value: marketReference,
      source_name: marketReference.source_name,
      source_url: marketReference.source_url,
      source_type: marketReference.source_type,
      scope: marketReference.scope,
      retrieved_at: marketReference.retrieved_at,
      observed_at: marketReference.observed_at,
      confidence: marketReference.confidence,
      manual_review_required: marketReference.manual_review_required,
      staleness_policy: marketReference.staleness_policy,
      notes: [`Latest usable municipal year: ${marketReference.year}.`],
    },
    local_insights: caseData.meta?.local_insights || [],
  } : {
    local_insights: caseData.meta?.local_insights || [],
    manual_review_required: true,
    notes: ['CRITICAL: No municipal market reference found for this location. Pricing is purely indicative.']
  };

  const notary = buildNotaryReferenceEvidence();
  policyContext.notary_purchase_reference = notary.purchase_calculator;
  policyContext.notary_mortgage_reference = notary.mortgage_calculator;

  const manualReviews = dedupe([
    !profileStatus.is_finance_ready ? 'Borrower profile onboarding is incomplete; finance fit is provisional.' : null,
    !marketReference ? 'CRITICAL: Missing market reference data for this municipality.' : null,
    marketReference?.manual_review_required ? 'Market dataset freshness should be cross-checked for recent local shifts.' : null,
    energyLookup?.manual_review_required ? 'Official energy registry lookup still needs to be reviewed manually.' : null,
    works.manual_review_required ? 'Works estimates need professional quotes.' : null,
    strategy.strategy.future_rental_goal ? 'Future rent upside is not modeled yet unless a sourced rent reference or current lease amount is available.' : null,
    !caseData.identity.region ? 'Region could not be resolved.' : null,
    !caseData.identity.municipality ? 'Municipality could not be resolved.' : null,
    !caseData.identity.normalized_address ? 'Address normalization is incomplete.' : null,
  ]);

  const analysis = {
    case_id: caseData.case_id,
    generated_at: nowIso(),
    profile_status: profileStatus,
    profile_context: profile,
    property_facts: propertyFacts,
    market_context: marketContext,
    policy_context: policyContext,
    lender_assumptions: lenderAssumptions,
    derived_metrics: {
      pricing,
      works,
      finance,
    },
    documents,
    manual_reviews: manualReviews,
    blockers: [],
    next_steps: [],
  };

  analysis.scores = scoreCase(caseData, analysis);
  analysis.decisions = makeDecision(caseData, analysis);
  analysis.next_steps = dedupe([
    !profileStatus.is_finance_ready ? 'Complete borrower onboarding before trusting finance fit, offer readiness, or bank readiness.' : null,
    analysis.decisions.next_best_action,
    !caseData.identity.normalized_address ? 'Get the exact street address from the seller, agent, or listing before relying on area-based metrics.' : null,
    energyLookup?.manual_review_required ? 'Open the official energy registry and confirm validity plus detailed certificate content.' : null,
    documents.missing.length > 0 ? `Collect ${documents.missing.length} missing document item(s).` : null,
    finance.financeability.verdict === 'tight' ? 'Stress-test the deal with a lower price or shorter works budget before offering.' : null,
  ]);

  return analysis;
}
