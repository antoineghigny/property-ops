#!/usr/bin/env node

import { loadCase, listCaseIds } from '../engine/shared/store.mjs';

let failures = 0;

for (const caseId of listCaseIds()) {
  try {
    loadCase(caseId);
    console.log(`OK: ${caseId}`);
  } catch (error) {
    console.log(`FAIL: ${caseId}: ${error.message}`);
    failures += 1;
  }
}

process.exit(failures > 0 ? 1 : 0);
