import { mkdirSync } from 'fs';

export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function nowIso() {
  return new Date().toISOString();
}

export function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatCurrency(value, currency = 'EUR') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'unknown';
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'unknown';
  }
  return `${round(value, 1)}%`;
}

export function parseMoneyLike(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value)
    .replace(/[^\d,.\-]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIntLike(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function splitCsvLike(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function inferBelgiumRegion(stateName) {
  const normalized = normalizeText(stateName);
  if (normalized.includes('be wal') || normalized.includes('be-wal') || normalized.startsWith('be-w') || normalized === 'wal') return 'WAL';
  if (normalized.includes('be vlg') || normalized.includes('be-vlg') || normalized.includes('be vla') || normalized.startsWith('be-v') || normalized === 'vlg') return 'VLG';
  if (normalized.includes('be bru') || normalized.includes('be-bru') || normalized === 'bru') return 'BRU';
  if (normalized.includes('bruxelles') || normalized.includes('brussels')) return 'BRU';
  if (normalized.includes('wallon') || normalized.includes('walloon')) return 'WAL';
  if (normalized.includes('flamand') || normalized.includes('flemish') || normalized.includes('vlaams')) return 'VLG';
  if (normalized.includes('hainaut') || normalized.includes('namur') || normalized.includes('liege') || normalized.includes('liege') || normalized.includes('luxembourg') || normalized.includes('brabant wallon')) return 'WAL';
  if (normalized.includes('antwerpen') || normalized.includes('anvers') || normalized.includes('limburg') || normalized.includes('oost vlaanderen') || normalized.includes('west vlaanderen') || normalized.includes('vlaams brabant') || normalized.includes('flemish brabant')) return 'VLG';
  return null;
}

export function confidenceFromIdentity(parts) {
  if (parts.house_number && parts.road && parts.postcode) return 'high';
  if (parts.road && parts.postcode) return 'medium';
  if (parts.city || parts.town || parts.municipality) return 'low';
  return 'unknown';
}

export function valueOrUnknown(value) {
  return value === null || value === undefined || value === '' ? 'unknown' : value;
}

export function dedupe(list) {
  return [...new Set((list || []).filter(Boolean))];
}

export function computeMonthlyMortgagePayment(principal, annualRatePct, durationYears) {
  if (!principal || principal <= 0 || !durationYears) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  const totalMonths = durationYears * 12;
  if (monthlyRate === 0) return principal / totalMonths;
  return principal * (monthlyRate / (1 - (1 + monthlyRate) ** (-totalMonths)));
}

export function propertyKindToStatbelLabel(kind) {
  if (kind === 'apartment') return 'appartements, flats, studios';
  if (kind === 'house') return "maisons d'habitation";
  if (kind === 'land') return 'terrains';
  return null;
}
