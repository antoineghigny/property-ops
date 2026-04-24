import { listCaseIds, loadAnalysis, loadCase } from '../shared/store.mjs';
import { formatCurrency } from '../shared/utils.mjs';

export function buildTracker() {
  const rows = listCaseIds().map(caseId => {
    const caseData = loadCase(caseId);
    const analysis = loadAnalysis(caseId);
    return {
      caseId,
      state: caseData.meta?.workflow_state || 'unknown',
      municipality: caseData.identity.municipality || 'unknown',
      region: caseData.identity.region || 'unknown',
      askingPrice: formatCurrency(caseData.economics.asking_price),
      verdict: analysis?.decisions?.verdict || 'not_analyzed',
      recommendationBand: analysis?.decisions?.recommendation_band || 'n/a',
      nextAction: analysis?.decisions?.next_best_action || 'Run analyze',
    };
  });

  const markdown = [
    '# Property Tracker',
    '',
    '| Case | State | Municipality | Region | Asking price | Verdict | Recommendation | Next action |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map(row => `| ${row.caseId} | ${row.state} | ${row.municipality} | ${row.region} | ${row.askingPrice} | ${row.verdict} | ${row.recommendationBand} | ${row.nextAction} |`),
  ].join('\n');

  return { rows, markdown };
}
