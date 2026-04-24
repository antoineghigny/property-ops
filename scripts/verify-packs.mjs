#!/usr/bin/env node

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { PACKS_DIR } from '../engine/shared/paths.mjs';

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

let failures = 0;

for (const file of walk(PACKS_DIR).filter(name => name.endsWith('.yml'))) {
  const pack = yaml.load(readFileSync(file, 'utf8'));
  if (!pack.pack_id && !pack.source_id) {
    console.log(`FAIL: ${file} is missing pack_id/source_id`);
    failures += 1;
  } else {
    console.log(`OK: ${file}`);
  }
}

process.exit(failures > 0 ? 1 : 0);
