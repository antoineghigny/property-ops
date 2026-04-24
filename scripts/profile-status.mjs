#!/usr/bin/env node

import { loadProfileStatus } from '../engine/shared/config.mjs';

const asJson = process.argv.includes('--json');
const status = loadProfileStatus();

if (asJson) {
  console.log(JSON.stringify(status, null, 2));
  process.exit(0);
}

console.log(`status: ${status.status}`);
console.log(`ready: ${status.is_ready}`);
console.log(`finance_ready: ${status.is_finance_ready}`);
console.log(`completeness_pct: ${status.completeness_pct}`);

for (const warning of status.warnings) {
  console.log(`warning: ${warning}`);
}
