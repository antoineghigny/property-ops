import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { ensureDir } from './utils.mjs';

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  ensureDir(resolve(path, '..'));
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

export function readText(path, fallback = '') {
  if (!existsSync(path)) return fallback;
  return readFileSync(path, 'utf8');
}

export function writeText(path, data) {
  ensureDir(resolve(path, '..'));
  writeFileSync(path, data, 'utf8');
}

export function listDirectories(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}
