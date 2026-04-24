import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBelgiumRegionPacks } from '../engine/shared/packs.mjs';

test('loadBelgiumRegionPacks returns region overrides', () => {
  const packs = loadBelgiumRegionPacks('BRU');
  assert.ok(packs.some(pack => pack.kind === 'registration_duties'));
  assert.ok(packs.some(pack => pack.kind === 'energy'));
});
