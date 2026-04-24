import AdmZip from 'adm-zip';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { CACHE_DIR } from '../../engine/shared/paths.mjs';
import { normalizeText, round } from '../../engine/shared/utils.mjs';

const DATA_URL = 'https://statbel.fgov.be/sites/default/files/files/opendata/immo/vastgoed_2010_9999.zip';
const CACHE_FILE = resolve(CACHE_DIR, 'statbel-immo-municipality-current.zip');

async function ensureDataset() {
  if (!existsSync(CACHE_FILE)) {
    const response = await fetch(DATA_URL, {
      headers: { 'user-agent': 'property-ops/0.1 (+https://example.invalid/property-ops)' },
    });
    if (!response.ok) {
      throw new Error(`Failed to download Statbel dataset: HTTP ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await import('fs/promises').then(fs => fs.writeFile(CACHE_FILE, bytes));
  }
  return CACHE_FILE;
}

function parseDataset(buffer) {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntries()[0];
  const text = entry.getData().toString('latin1');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  const keys = header.split('|');
  return rows.map(row => {
    const values = row.split('|');
    return Object.fromEntries(keys.map((key, index) => [key, values[index] || '']));
  });
}

function toNumber(value) {
  const number = Number(value || 0);
  return number || null;
}

function pickStatbelTypes(propertyKind, facadesCount) {
  if (propertyKind === 'apartment') {
    return {
      labels: ['appartements, flats, studios'],
      blended: false,
    };
  }
  if (propertyKind === 'land') {
    return {
      labels: ['terrains'],
      blended: false,
    };
  }
  if (propertyKind !== 'house') {
    return {
      labels: [],
      blended: false,
    };
  }

  if (Number(facadesCount || 0) >= 4) {
    return {
      labels: ['maisons avec 4 ou plus de facades (type ouvert)'],
      blended: false,
    };
  }
  if (Number(facadesCount || 0) > 0) {
    return {
      labels: ['maisons avec 2 ou 3 facades (type ferme + type demi-ferme)'],
      blended: false,
    };
  }

  return {
    labels: [
      'maisons avec 2 ou 3 facades (type ferme + type demi-ferme)',
      'maisons avec 4 ou plus de facades (type ouvert)',
    ],
    blended: true,
  };
}

function summarizeRows(rows, blended) {
  const transactions = rows.reduce((total, row) => total + (toNumber(row.MS_TOTAL_TRANSACTIONS) || 0), 0);
  const weighted = key => {
    if (!transactions) return null;
    let numerator = 0;
    let denominator = 0;
    for (const row of rows) {
      const value = toNumber(row[key]);
      const weight = toNumber(row.MS_TOTAL_TRANSACTIONS) || 0;
      if (value === null || weight === 0) continue;
      numerator += value * weight;
      denominator += weight;
    }
    return denominator ? round(numerator / denominator, 0) : null;
  };

  return {
    year: Math.max(...rows.map(row => Number(row.CD_YEAR) || 0)),
    transactions,
    mean_price: null,
    p25: weighted('MS_P_25'),
    p50: weighted('MS_P_50_median'),
    p75: weighted('MS_P_75'),
    blended_typologies: blended ? rows.map(row => row.CD_TYPE_FR) : [],
  };
}

export async function getMunicipalityMarketContext({ municipality, propertyKind, facadesCount = null }) {
  if (!municipality || !propertyKind) {
    return null;
  }

  const datasetPath = await ensureDataset();
  const buffer = await import('fs/promises').then(fs => fs.readFile(datasetPath));
  const rows = parseDataset(buffer);
  const targetMunicipality = normalizeText(municipality);
  const typeSelection = pickStatbelTypes(propertyKind, facadesCount);
  if (typeSelection.labels.length === 0) return null;
  const targetTypes = typeSelection.labels.map(label => normalizeText(label));
  const municipalityVariants = targetMunicipality
    .split(/[-/]/)
    .map(item => normalizeText(item))
    .filter(Boolean);
  municipalityVariants.push(...municipalityAliases(targetMunicipality));

  const matching = rows.filter(row =>
    row.CD_PERIOD === 'Y'
    && row.CD_niveau_refnis === '5'
    && matchesMunicipality(row, targetMunicipality, municipalityVariants)
    && targetTypes.includes(normalizeText(row.CD_TYPE_FR))
  );

  if (matching.length === 0) {
    return null;
  }

  const latestYear = Math.max(...matching.map(row => Number(row.CD_YEAR) || 0));
  const latestRows = matching.filter(row => Number(row.CD_YEAR) === latestYear);
  const summary = summarizeRows(latestRows, typeSelection.blended);
  const currentYear = new Date().getUTCFullYear();
  const age = currentYear - latestYear;
  const confidence = age <= 1 && !typeSelection.blended ? 'high' : age <= 2 ? 'medium' : 'low';

  return {
    source_name: 'Statbel municipality market dataset',
    source_url: DATA_URL,
    source_type: 'open_data',
    scope: 'official',
    confidence,
    manual_review_required: age > 1 || typeSelection.blended,
    retrieved_at: new Date().toISOString(),
    observed_at: `${latestYear}-12-31`,
    staleness_policy: 'downgrade confidence when dataset is older than the current year minus two',
    municipality: latestRows[0].CD_REFNIS_FR || latestRows[0].CD_REFNIS_NL,
    year: latestYear,
    transactions: summary.transactions,
    mean_price: summary.mean_price,
    p25: summary.p25,
    p50: summary.p50,
    p75: summary.p75,
    blended_typologies: summary.blended_typologies,
  };
}

function matchesMunicipality(row, targetMunicipality, municipalityVariants) {
  const fr = normalizeText(row.CD_REFNIS_FR || '');
  const nl = normalizeText(row.CD_REFNIS_NL || '');
  if (fr === targetMunicipality || nl === targetMunicipality) return true;
  return municipalityVariants.some(variant => variant && (fr === variant || nl === variant));
}

function municipalityAliases(targetMunicipality) {
  const aliases = {
    brussels: ['bruxelles', 'brussel'],
    antwerp: ['anvers', 'antwerpen'],
    ghent: ['gand', 'gent'],
    liege: ['liege', 'liège', 'luik'],
    bruges: ['bruges', 'brugge'],
    louvain: ['leuven', 'louvain'],
    mechelen: ['malines', 'mechelen'],
  };
  return aliases[targetMunicipality] || [];
}
