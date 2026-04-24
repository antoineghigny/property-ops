import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestFromUrl } from '../adapters/listings/fetch-listing.mjs';

test('ingestFromUrl prefers listing title and description for type, area, and address extraction', async () => {
  const html = `
    <html>
      <head>
        <title>Maison à vendre à GOSSELIES - 249 000 € - 4 chambres - 185m² - Immoweb</title>
        <meta property="og:description" content="Vente maison à GOSSELIES. Prix: 249 000 €. Adresse: Faubourg de Bruxelles 174 6041 — GOSSELIES">
      </head>
      <body>
        <div>Description Maison récemment rénovée à vendre à Gosselies. Cette spacieuse maison 2 façades en excellent état à Gosselies dispose aussi d'une terrasse de 26 m².</div>
      </body>
    </html>
  `;

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    text: async () => html,
  });

  try {
    const caseData = await ingestFromUrl('https://www.immoweb.be/fr/annonce/maison/a-vendre/gosselies/6041/21517724');
    assert.equal(caseData.source.source_id, '21517724');
    assert.equal(caseData.typology.property_kind, 'house');
    assert.equal(caseData.typology.living_area_m2, 185);
    assert.equal(caseData.typology.facades_count, 2);
    assert.equal(caseData.typology.condominium, false);
    assert.match(caseData.identity.raw_address, /Faubourg de Bruxelles 174, 6041, GOSSELIES/i);
  } finally {
    global.fetch = originalFetch;
  }
});
