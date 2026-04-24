import { confidenceFromIdentity, inferBelgiumRegion } from '../../engine/shared/utils.mjs';

export async function geocodeAddress(rawAddress) {
  if (!rawAddress) {
    return {
      normalized_address: null,
      identity_confidence: 'unknown',
      source: null,
    };
  }

  const query = new URLSearchParams({
    q: rawAddress,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
    headers: {
      'user-agent': 'property-ops/0.1 (+https://example.invalid/property-ops)',
      'accept-language': 'en,fr-BE,fr;q=0.9,nl;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: HTTP ${response.status}`);
  }

  const results = await response.json();
  const top = results[0];
  if (!top) {
    return {
      normalized_address: null,
      identity_confidence: 'unknown',
      source: {
        source_name: 'OpenStreetMap Nominatim',
        source_url: `https://nominatim.openstreetmap.org/search?${query.toString()}`,
      },
    };
  }

  const parts = top.address || {};
  const regionSignal = parts['ISO3166-2-lvl4']
    || parts.state
    || parts.region
    || parts.county
    || parts['ISO3166-2-lvl6']
    || '';
  const region = top.address?.country_code?.toUpperCase() === 'BE'
    ? inferBelgiumRegion(regionSignal)
    : null;
  const municipality = parts.city || parts.municipality || parts.county || parts.town || parts.village || null;
  const district = parts.suburb
    || parts.city_district
    || (parts.town && parts.town !== municipality ? parts.town : null)
    || null;

  return {
    normalized_address: top.display_name,
    postal_code: parts.postcode || null,
    municipality,
    district,
    lat: Number(top.lat),
    lng: Number(top.lon),
    geocode_precision: top.type || null,
    region,
    identity_confidence: confidenceFromIdentity(parts),
    source: {
      source_name: 'OpenStreetMap Nominatim',
      source_url: `https://nominatim.openstreetmap.org/search?${query.toString()}`,
    },
  };
}
