import yaml from 'js-yaml';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { PACKS_DIR } from './paths.mjs';

function loadYaml(path) {
  if (!existsSync(path)) return null;
  return yaml.load(readFileSync(path, 'utf8'));
}

export function loadBelgiumRegionPacks(region) {
  const baseDir = resolve(PACKS_DIR, 'countries', 'be', 'base');
  const regionDir = resolve(PACKS_DIR, 'countries', 'be', 'regions', region.toLowerCase());
  const files = [
    resolve(baseDir, 'registration-duties.yml'),
    resolve(baseDir, 'energy.yml'),
  ];
  if (existsSync(regionDir)) {
    for (const name of readdirSync(regionDir)) {
      files.push(resolve(regionDir, name));
    }
  }
  return files.map(loadYaml).filter(Boolean);
}

export function loadLenderPack(packId) {
  const path = resolve(PACKS_DIR, 'lenders', 'be', `${packId}.yml`);
  return loadYaml(path);
}

export function loadConstructionPack(packId) {
  const path = resolve(PACKS_DIR, 'construction', `${packId}.yml`);
  return loadYaml(path);
}

export function loadSourcePolicies() {
  const dir = resolve(PACKS_DIR, 'source-policies');
  return readdirSync(dir)
    .filter(name => name.endsWith('.yml'))
    .map(name => loadYaml(resolve(dir, name)))
    .filter(Boolean);
}

export function getPackByKind(packs, kind) {
  return packs.filter(pack => pack.kind === kind);
}
