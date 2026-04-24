import { load } from 'cheerio';
import { nowIso, parseIntLike, parseMoneyLike, slugify } from '../../engine/shared/utils.mjs';

/**
 * UNIVERSAL AGNOSTIC SCRAPER
 * Captures the entire page content as a "Melting Pot" for AI processing.
 * No site-specific rules, just raw data extraction.
 */
export async function ingestFromUrl(url, requestedCaseId = null) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept-language': 'en,fr-BE,fr;q=0.9,nl;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch listing URL: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);
  
  // 1. RAW DUMP (THE MELTING POT)
  // We capture everything: text, hidden scripts, meta tags
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const metaTags = $('meta').map((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property');
    const content = $(el).attr('content');
    return name && content ? `${name}: ${content}` : null;
  }).get().filter(Boolean).join('\n');
  
  const jsonLd = $('script[type="application/ld+json"]').map((_, el) => $(el).contents().text()).get().join('\n');
  
  const rawDump = `URL: ${url}\n\nMETADATA:\n${metaTags}\n\nJSON-LD PAYLOADS:\n${jsonLd}\n\nBODY TEXT:\n${bodyText}`;

  // 2. MINIMAL HEURISTICS (For case identity)
  const title = $('meta[property="og:title"]').attr('content')
    || $('title').text().trim()
    || 'Untitled listing';

  const images = $('img').map((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    const alt = $(el).attr('alt') || '';
    return src ? { src, alt } : null;
  }).get().filter(item => item && item.src.startsWith('http')).slice(0, 50);

  const caseId = requestedCaseId || slugify(title);

  return {
    case_id: caseId,
    source: {
      portal: new URL(url).hostname,
      listing_url: url,
      source_id: null, // AI will extract
      collected_at: nowIso(),
      last_verified_at: nowIso(),
      listing_status: 'active',
    },
    identity: {
      raw_address: null, // AI will extract
      country: /belg/i.test(bodyText) || /\.be\b/.test(url) ? 'BE' : 'FR',
      identity_confidence: 'unknown',
    },
    listing: {
      title,
      raw_description: bodyText.slice(0, 5000),
      raw_dump: rawDump, // THE MELTING POT
      images: images.map(img => img.src),
      image_details: images, // For alt-tag analysis
    },
    typology: {
      property_kind: 'unknown', // AI will extract
      condition_kind: 'unknown', // AI will extract
      living_area_m2: null, // AI will extract
    },
    economics: {
      asking_price: null, // AI will extract
    },
    energy: {
      label: null, // AI will extract
    },
    meta: {
      workflow_state: 'ingested',
    },
  };
}
