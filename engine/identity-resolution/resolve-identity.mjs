import { geocodeAddress } from '../../adapters/geocoding/nominatim.mjs';
import { loadCase, saveCase, appendDecisionLog, setWorkflowState } from '../shared/store.mjs';

export async function resolveIdentity(caseId) {
  const current = loadCase(caseId);
  const rawAddress = current.identity.raw_address || current.identity.normalized_address;

  if (!rawAddress) {
    current.identity.identity_confidence = 'unknown';
    saveCase(current);
    appendDecisionLog(caseId, 'identity_resolution_skipped', null, { reason: 'missing_raw_address' }, ['No raw address was available.']);
    return current;
  }

  const resolved = await geocodeAddress(rawAddress);
  current.identity = {
    ...current.identity,
    normalized_address: resolved.normalized_address || current.identity.normalized_address || rawAddress,
    postal_code: resolved.postal_code || current.identity.postal_code || null,
    municipality: resolved.municipality || current.identity.municipality || null,
    district: resolved.district || current.identity.district || null,
    lat: resolved.lat ?? current.identity.lat ?? null,
    lng: resolved.lng ?? current.identity.lng ?? null,
    geocode_precision: resolved.geocode_precision || current.identity.geocode_precision || null,
    region: resolved.region || current.identity.region || null,
    identity_confidence: resolved.identity_confidence || current.identity.identity_confidence || 'unknown',
    identity_conflicts: current.identity.identity_conflicts || [],
  };

  const saved = saveCase(current);
  setWorkflowState(caseId, 'identity_resolved');
  appendDecisionLog(caseId, 'identity_resolved', null, saved.identity, ['Geocoding and region resolution were refreshed.']);
  return saved;
}
