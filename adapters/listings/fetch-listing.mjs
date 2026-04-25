import { chromium } from 'playwright';
import { load } from 'cheerio';
import { nowIso, slugify } from '../../engine/shared/utils.mjs';

function getRealisticHeaders(url) {
  const host = new URL(url).hostname;
  return {
    'authority': host,
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'fr-BE,fr;q=0.9,en-US;q=0.8',
    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  };
}

async function fetchWithSimpleGet(url) {
  try {
    const response = await fetch(url, { headers: getRealisticHeaders(url) });
    if (!response.ok) return null;
    const html = await response.text();
    if (html.includes('dd=') || html.includes('captcha-delivery')) return null;
    return html;
  } catch (e) { return null; }
}

async function fetchWithBrowser(url) {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-BE', 'fr', 'en-US', 'en'] });
  });

  try {
    await page.goto('https://www.google.be/search?q=immoweb+investir', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(2000);

    const html = await page.content();
    if (html.includes('dd=') || html.includes('captcha-delivery')) return null;
    return html;
  } catch (e) { return null; }
  finally { await browser.close(); }
}

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
  const rawDump = `URL: ${url}\n\nBODY TEXT:\n${bodyText}`;

  const title = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || 'Untitled';
  const lastPart = new URL(url).pathname.split('/').filter(Boolean).at(-1);
  const caseId = requestedCaseId || `${slugify(title).replace(/immoweb|zimmo|realo/gi, '')}-${lastPart}`.replace(/^-+|-+$/g, '');

  return {
    case_id: caseId,
    source: { portal: new URL(url).hostname, listing_url: url, collected_at: nowIso() },
    identity: { raw_address: null, country: 'BE', identity_confidence: 'unknown' },
    listing: { title, raw_description: bodyText.slice(0, 5000), raw_dump: rawDump, images: [] },
    typology: { property_kind: 'unknown', condition_kind: 'unknown', living_area_m2: null },
    economics: { asking_price: null },
    energy: { label: null },
    meta: { workflow_state: 'ingested' },
  };
}
