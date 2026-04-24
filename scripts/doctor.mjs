#!/usr/bin/env node

import { existsSync } from 'fs';
import { resolve } from 'path';
import { CONFIG_DIR, OUTPUT_DIR, REPORTS_DIR, CASES_DIR } from '../engine/shared/paths.mjs';
import { ensureDir } from '../engine/shared/utils.mjs';
import { loadProfileStatus } from '../engine/shared/config.mjs';

const checks = [
  ['profile config', resolve(CONFIG_DIR, 'profile.yml'), resolve(CONFIG_DIR, 'profile.example.yml')],
  ['strategy config', resolve(CONFIG_DIR, 'strategy.yml'), resolve(CONFIG_DIR, 'strategy.example.yml')],
  ['lenders config', resolve(CONFIG_DIR, 'lenders.yml'), resolve(CONFIG_DIR, 'lenders.example.yml')],
];

let failures = 0;

for (const [label, primary, fallback] of checks) {
  if (existsSync(primary) || existsSync(fallback)) {
    console.log(`OK: ${label}`);
  } else {
    console.log(`FAIL: missing ${label}`);
    failures += 1;
  }
}

try {
  const profileStatus = loadProfileStatus();
  if (!profileStatus.is_ready) {
    console.log(`WARN: borrower profile is ${profileStatus.status}`);
    for (const warning of profileStatus.warnings) {
      console.log(`WARN: ${warning}`);
    }
  } else {
    console.log('OK: borrower profile is configured');
  }
} catch (error) {
  console.log(`WARN: could not evaluate borrower profile status (${error.message})`);
}

ensureDir(CASES_DIR);
ensureDir(OUTPUT_DIR);
ensureDir(REPORTS_DIR);

console.log(`Node version: ${process.version}`);
console.log('Property-Ops doctor completed.');

process.exit(failures > 0 ? 1 : 0);
