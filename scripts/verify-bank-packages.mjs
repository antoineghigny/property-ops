#!/usr/bin/env node

import { listCaseIds, caseFile } from '../engine/shared/store.mjs';
import { existsSync } from 'fs';
import { readText } from '../engine/shared/fs.mjs';

let failures = 0;

for (const caseId of listCaseIds()) {
  const htmlPath = caseFile(caseId, 'bank-package.html');
  if (!existsSync(htmlPath)) continue;
  const html = readText(htmlPath);
  if (html.includes('{{') || html.includes('}}')) {
    console.log(`FAIL: unresolved placeholders in ${htmlPath}`);
    failures += 1;
  } else {
    console.log(`OK: ${htmlPath}`);
  }
}

process.exit(failures > 0 ? 1 : 0);
