#!/usr/bin/env node

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { mkdirSync } from 'fs';

function normalizeTextForPDF(html) {
  return html
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, '...');
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: node scripts/generate-pdf.mjs <input.html> <output.pdf>');
    process.exit(1);
  }

  const inputPath = resolve(input);
  const outputPath = resolve(output);
  mkdirSync(dirname(outputPath), { recursive: true });

  const rawHtml = await readFile(inputPath, 'utf8');
  const html = normalizeTextForPDF(rawHtml);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle', baseURL: `file://${dirname(inputPath)}/` });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.6in',
        right: '0.6in',
        bottom: '0.6in',
        left: '0.6in',
      },
    });
    console.log(outputPath);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
