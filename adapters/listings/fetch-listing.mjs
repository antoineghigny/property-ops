import { load } from 'cheerio';
import { nowIso, parseIntLike, parseMoneyLike, slugify } from '../../engine/shared/utils.mjs';

function extractJsonLd($) {
  const payloads = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const parsed = JSON.parse(raw);
      payloads.push(parsed);
    } catch {
      // ignore invalid JSON-LD blocks
    }
  });
  return payloads.flatMap(item => (Array.isArray(item) ? item : [item]));
}

function textFromBody($) {
  return $('body').text().replace(/\s+/g, ' ').trim();
}

function firstMatch(text, pattern, transform) {
  const match = text.match(pattern);
  return match ? transform(match) : null;
}

function allMatches(text, pattern, transform) {
  return [...String(text || '').matchAll(pattern)]
    .map(match => transform(match))
    .filter(value => value !== null && value !== undefined);
}

function extractSourceId(url) {
  const match = String(url || '').match(/\/(\d{6,})(?:[/?#]|$)/);
  return match ? match[1] : null;
}

function extractAddressCandidate(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/adresse\s*:\s*([^|]+)$/i)
    || normalized.match(/adresse\s*:\s*([^.]*)/i);
  if (!match) return null;
  return match[1]
    .replace(/\s+[—-]\s+/g, ', ')
    .replace(/(\d)\s+(\d{4})(?=\b)/g, '$1, $2')
    .replace(/\s+,/g, ',')
    .trim();
}

function extractPropertyKind(url, signalText, bodyText) {
  if (/\/maison\//i.test(url) || /\bhouse|maison|woning|villa\b/i.test(signalText)) return 'house';
  if (/\/appartement\//i.test(url) || /\bapartment|appartement|flat|studio\b/i.test(signalText)) return 'apartment';
  if (/\bhouse|maison|woning|villa\b/i.test(bodyText)) return 'house';
  if (/\bapartment|appartement|flat|studio\b/i.test(bodyText)) return 'apartment';
  return null;
}

function extractLivingArea(signalText, jsonArea, bodyText) {
  const signalArea = firstMatch(signalText, /(\d{1,4}(?:[.,]\d+)?)\s?m(?:²|2)(?!\w)/i, match => parseMoneyLike(match[1]));
  if (signalArea) return signalArea;
  if (jsonArea) return jsonArea;

  const candidates = allMatches(
    bodyText,
    /(?:surface(?:\s+habitable)?|habitable|living area|woonoppervlakte)\s*[:\-]?\s*(\d{1,4}(?:[.,]\d+)?)\s?m(?:²|2)(?!\w)/gi,
    match => parseMoneyLike(match[1]),
  );
  if (candidates.length > 0) return candidates[0];

  const fallback = allMatches(bodyText, /(\d{2,4}(?:[.,]\d+)?)\s?m(?:²|2)(?!\w)/gi, match => parseMoneyLike(match[1]))
    .filter(value => value >= 25 && value <= 600)
    .sort((left, right) => right - left);
  return fallback[0] || null;
}

export async function ingestFromUrl(url, requestedCaseId = null) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'property-ops/0.1 (+https://example.invalid/property-ops)',
      'accept-language': 'en,fr-BE,fr;q=0.9,nl;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch listing URL: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);
  const jsonLd = extractJsonLd($);
  const bodyText = textFromBody($);

  const title = $('meta[property="og:title"]').attr('content')
    || $('title').text().trim()
    || $('h1').first().text().trim()
    || 'Untitled listing';

  const description = $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || bodyText.slice(0, 3000);
  const signalText = `${title} ${description}`.replace(/\s+/g, ' ').trim();

  const aggregateJson = jsonLd.find(item => item?.offers || item?.address || item?.floorSize);
  const addressObject = aggregateJson?.address || aggregateJson?.itemOffered?.address;
  const jsonAddress = [
    addressObject?.streetAddress,
    addressObject?.postalCode,
    addressObject?.addressLocality,
    addressObject?.addressCountry,
  ].filter(Boolean).join(', ') || null;
  const rawAddress = jsonAddress || extractAddressCandidate(signalText) || extractAddressCandidate(bodyText);

  const textPrice = firstMatch(signalText, /(\d[\d\s.,]{3,})\s?(?:€|eur)/i, match => parseMoneyLike(match[1]))
    ?? firstMatch(bodyText, /(\d[\d\s.,]{3,})\s?(?:€|eur)/i, match => parseMoneyLike(match[1]));
  const jsonPrice = parseMoneyLike(aggregateJson?.offers?.price || aggregateJson?.price);
  const askingPrice = jsonPrice ?? textPrice;

  const jsonArea = parseMoneyLike(aggregateJson?.floorSize?.value || aggregateJson?.floorSize);
  const livingArea = extractLivingArea(signalText, jsonArea, bodyText);

  const bedrooms = firstMatch(signalText, /(\d+)\s?(?:bedroom|bedrooms|chambre|chambres|slaapkamer|slaapkamers)/i, match => parseIntLike(match[1]))
    ?? firstMatch(bodyText, /(\d+)\s?(?:bedroom|bedrooms|chambre|chambres|slaapkamer|slaapkamers)/i, match => parseIntLike(match[1]));

  // ENHANCED PEB DETECTION
  let label = firstMatch(signalText, /\b(?:peb|epc|dpe|classe énergétique)\s*[:\-]?\s*([a-g])\b/i, match => match[1].toUpperCase())
    ?? firstMatch(bodyText, /\b(?:peb|epc|dpe|classe énergétique)\s*[:\-]?\s*([a-g])\b/i, match => match[1].toUpperCase());

  if (!label) {
    // Check images and icons (common on Immoweb/Zimmo)
    $('img, span, div').each((_, el) => {
      const text = $(el).attr('alt') || $(el).attr('class') || '';
      const match = text.match(/\bpeb[-_\s]?([a-g])\b/i) || text.match(/\bepc[-_\s]?([a-g])\b/i);
      if (match) {
        label = match[1].toUpperCase();
        return false; // break loop
      }
    });
  }

  const certificateNumber = firstMatch(bodyText, /(\d{8}-\d{10}-\d{2}-\d)/, match => match[1]);
  const kind = extractPropertyKind(url, signalText, bodyText);
  const facadesCount = firstMatch(bodyText, /(\d+)\s*(?:façades?|facades?|gevels?)/i, match => parseIntLike(match[1]));
  const conditionKind = /\br[ée]nov[ée]e?s?\b|renovated/i.test(bodyText) ? 'renovated' : 'unknown';

  const caseId = requestedCaseId || slugify(title);

  return {
    case_id: caseId,
    source: {
      portal: new URL(url).hostname,
      listing_url: url,
      source_id: extractSourceId(url),
      collected_at: nowIso(),
      last_verified_at: nowIso(),
      listing_status: 'active',
    },
    identity: {
      raw_address: rawAddress,
      country: /belg/i.test(bodyText) || /\.be\b/.test(url) ? 'BE' : 'FR',
      identity_confidence: 'unknown',
    },
    listing: {
      title,
      raw_description: description,
      cleaned_description: description,
      images: $('img').map((_, el) => $(el).attr('src')).get().filter(Boolean).slice(0, 20),
      plans: [],
      attached_documents: [],
      seller_contact: null,
    },
    typology: {
      property_kind: kind,
      condition_kind: conditionKind,
      facades_count: facadesCount,
      living_area_m2: livingArea,
      bedrooms,
      condominium: kind === 'apartment' ? true : kind === 'house' ? false : null,
    },
    economics: {
      asking_price: askingPrice,
      asking_price_per_m2: askingPrice && livingArea ? askingPrice / livingArea : null,
    },
    technical: {},
    energy: {
      label,
      certificate_number: certificateNumber,
    },
    meta: {
      workflow_state: 'ingested',
    },
  };
}
