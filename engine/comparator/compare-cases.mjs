import { loadAnalysis, loadCase } from '../shared/store.mjs';
import { formatCurrency, round } from '../shared/utils.mjs';

export function compareCases(caseIds) {
  const rows = caseIds.map(caseId => {
    const caseData = loadCase(caseId);
    const analysis = loadAnalysis(caseId);
    if (!analysis) {
      return { caseId, status: 'not_analyzed' };
    }
    return {
      caseId,
      verdict: analysis.decisions.verdict,
      askingPrice: formatCurrency(caseData.economics.asking_price),
      totalProjectCost: formatCurrency(analysis.derived_metrics.finance.acquisition_costs.total_project_cost),
      targetPrice: formatCurrency(analysis.derived_metrics.pricing.target_price),
      monthlyPayment: formatCurrency(analysis.derived_metrics.finance.baseline.monthly_payment),
      dealScore: analysis.scores.deal_score,
      financeFitScore: analysis.scores.finance_fit_score,
      riskScore: analysis.scores.risk_score,
      dataConfidenceScore: analysis.scores.data_confidence_score,
      executionScore: analysis.scores.execution_score,
      debtRatio: analysis.derived_metrics.finance.financeability.debt_ratio_pct === null ? 'unknown' : `${round(analysis.derived_metrics.finance.financeability.debt_ratio_pct, 1)}%`,
      manualReviews: analysis.manual_reviews.length,
    };
  });

  const markdown = [
    '# Property Comparison',
    '',
    '| Case | Verdict | Asking price | Total project cost | Target price | Monthly payment | Deal | Finance | Risk | Data | Execution | Debt ratio | Manual reviews |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|',
    ...rows.map(row => `| ${row.caseId} | ${row.verdict || row.status} | ${row.askingPrice || 'n/a'} | ${row.totalProjectCost || 'n/a'} | ${row.targetPrice || 'n/a'} | ${row.monthlyPayment || 'n/a'} | ${row.dealScore ?? 'n/a'} | ${row.financeFitScore ?? 'n/a'} | ${row.riskScore ?? 'n/a'} | ${row.dataConfidenceScore ?? 'n/a'} | ${row.executionScore ?? 'n/a'} | ${row.debtRatio || 'n/a'} | ${row.manualReviews ?? 'n/a'} |`),
  ].join('\n');

  return { rows, markdown };
}
