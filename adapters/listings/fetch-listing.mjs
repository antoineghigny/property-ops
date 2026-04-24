import { chromium } from 'playwright';
import { load } from 'cheerio';
import { nowIso, parseIntLike, parseMoneyLike, slugify } from '../../engine/shared/utils.mjs';

async function fetchWithSimpleGet(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) return null;
  return await response.text();
}

async function fetchWithBrowser(url) {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2000);
    return await page.content();
  } catch (e) {
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * HYBRID AGNOSTIC SCRAPER
 * Tries simple fetch first (works for Immoweb), falls back to Playwright (for Zimmo/Realo).
 */
export async function ingestFromUrl(url, requestedCaseId = null) {
  const isZimmo = url.includes('zimmo.be');
  let html = isZimmo ? null : await fetchWithSimpleGet(url);
  
  if (!html) {
    html = await fetchWithBrowser(url);
  }

  if (!html) {
    throw new Error(`Failed to capture content for URL: ${url}`);
  }

  const $ = load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const metaTags = $('meta').map((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property');
    const content = $(el).attr('content');
    return name && content ? `${name}: ${content}` : null;
  }).get().filter(Boolean).join('\n');
  
  const jsonLd = $('script[type="application/ld+json"]').map((_, el) => $(el).contents().text()).get().join('\n');
  const rawDump = `URL: ${url}\n\nMETADATA:\n${metaTags}\n\nJSON-LD PAYLOADS:\n${jsonLd}\n\nBODY TEXT:\n${bodyText}`;

  const title = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || 'Untitled';
  const images = $('img').map((_, el) => $(el).attr('src')).get().filter(src => src && src.startsWith('http')).slice(0, 50);

  // UNIQUE CASE ID
  let caseId = requestedCaseId;
  if (!caseId) {
    const lastPart = new URL(url).pathname.split('/').filter(Boolean).at(-1);
    caseId = `${slugify(title).replace(/immoweb|zimmo|realo/gi, '')}-${lastPart}`.replace(/^-+|-+$/g, '');
  }

  return {
    case_id: caseId,
    source: {
      portal: new URL(url).hostname,
      listing_url: url,
      source_id: null,
      collected_at: nowIso(),
      last_verified_at: nowIso(),
      listing_status: 'active',
    },
    identity: { raw_address: null, country: 'BE', identity_confidence: 'unknown' },
    listing: {
      title,
      raw_description: bodyText.slice(0, 5000),
      raw_dump: rawDump,
      images,
    },
    typology: { property_kind: 'unknown', condition_kind: 'unknown', living_area_m2: null },
    economics: { asking_price: null },
    energy: { label: null },
    meta: { workflow_state: 'ingested' },
  };
}
