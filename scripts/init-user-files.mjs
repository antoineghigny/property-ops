#!/usr/bin/env node

import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const files = [
  ['config/profile.example.yml', 'config/profile.yml'],
  ['config/lenders.example.yml', 'config/lenders.yml'],
  ['config/strategy.example.yml', 'config/strategy.yml'],
];

const force = process.argv.includes('--force');
const copied = [];
const skipped = [];

for (const [sourceRelative, targetRelative] of files) {
  const source = resolve(sourceRelative);
  const target = resolve(targetRelative);
  if (existsSync(target) && !force) {
    skipped.push(targetRelative);
    continue;
  }
  copyFileSync(source, target);
  copied.push(targetRelative);
}

if (copied.length > 0) {
  console.log(`Copied: ${copied.join(', ')}`);
}
if (skipped.length > 0) {
  console.log(`Skipped existing: ${skipped.join(', ')}`);
}
if (copied.length === 0 && skipped.length === 0) {
  console.log('No user files were initialized.');
}
