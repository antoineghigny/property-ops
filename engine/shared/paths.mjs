import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(__dirname, '../..');
export const CONFIG_DIR = resolve(ROOT, 'config');
export const DATA_DIR = resolve(ROOT, 'data');
export const CASES_DIR = resolve(DATA_DIR, 'cases');
export const TRACKER_DIR = resolve(DATA_DIR, 'tracker');
export const DECISION_LOG_DIR = resolve(DATA_DIR, 'decision-log');
export const DOCUMENT_VAULT_DIR = resolve(DATA_DIR, 'document-vault');
export const CACHE_DIR = resolve(DATA_DIR, 'cache');
export const PACKS_DIR = resolve(ROOT, 'packs');
export const TEMPLATES_DIR = resolve(ROOT, 'templates');
export const REPORTS_DIR = resolve(ROOT, 'reports');
export const OUTPUT_DIR = resolve(ROOT, 'output');
