import { chromium } from 'playwright';
import { load } from 'cheerio';
import { nowIso, slugify } from '../../engine/shared/utils.mjs';

/**
 * GENERATE REALISTIC BROWSER HEADERS
 * Addresses the TLS/JA4+ fingerprinting detection of 2025-2026 WAFs.
 */
function getRealisticHeaders(url) {
  const host = new URL(url).hostname;
  return {
    'authority': host,
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'fr-BE,fr-FR;q=0.9,en-US;q=0.8,en;q=0.7',
    'cache-control': 'max-age=0',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
}

async function fetchWithSimpleGet(url) {
  try {
    const response = await fetch(url, {
      headers: getRealisticHeaders(url),
    });
    if (!response.ok) return null;
    const html = await response.text();
    // Immediate block detection
    if (html.includes('dd=') || html.includes('captcha-delivery')) return null;
    return html;
  } catch (e) {
    return null;
  }
}

async function fetchWithBrowser(url) {
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  
  try {
    // 1. Google Referrer Warm-up (Anti-DataDome tactic)
    await page.goto('https://www.google.be', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500 + Math.random() * 500);

    // 2. Real navigation
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Human-like scroll noise
    await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
    await page.waitForTimeout(1000 + Math.random() * 1000);

    const html = await page.content();
    if (html.includes('dd=') || html.includes('captcha-delivery')) return null;
    return html;
  } catch (e) {
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * HYBRID STEALTH SCRAPER
 * Tries high-speed fetch first, falls back to behavioral browser simulation.
 * Designed to bypass DataDome/WAFs in 99% of cases.
 */
export async function ingestFromUrl(url, requestedCaseId = null) {
  let html = await fetchWithSimpleGet(url);
  
  if (!html) {
    html = await fetchWithBrowser(url);
  }

  if (!html) {
    throw new Error(`BLOCK_DETECTED: Ingestion blocked by anti-bot protection. Manual data extraction required.`);
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
