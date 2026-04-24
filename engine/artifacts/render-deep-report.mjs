import { loadCase, loadAnalysis, saveCaseArtifact } from '../shared/store.mjs';
import { formatCurrency } from '../shared/utils.mjs';
import { renderExpertAudit } from './render-expert-audit.mjs';

export function renderDeepReport(caseData, analysis, profile) {
  // We now leverage the Expert Audit for the core intelligence
  const expertAudit = renderExpertAudit(caseData, analysis, profile);
  
  const pricing = analysis.derived_metrics.pricing;
  const finance = analysis.derived_metrics.finance;
  
  let report = expertAudit; // Start with the Expert Audit
  
  report += `\n---\n\n`;
  report += `## 🛠️ TECHNICAL DATA APPENDIX\n\n`;
  
  report += `### A. Detailed Pricing Metrics\n`;
  report += `* **Intrinsic Value Estimate:** ${formatCurrency(pricing.intrinsic_value)}\n`;
  report += `* **Target Negotiation Price:** ${formatCurrency(pricing.target_price)}\n`;
  report += `* **Rational Max Price:** ${formatCurrency(pricing.rational_max_price)}\n`;
  report += `* **Market Gap:** ${pricing.relative_market_gap_pct}% (Positive margin means undervalued)\n\n`;

  report += `### B. Financial Scenarios (Detailed)\n`;
  report += `| Scenario | Monthly | Debt Ratio | Remaining Income |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;
  report += `| **Baseline** | ${formatCurrency(finance.baseline?.monthly_payment)} | ${finance.baseline?.debt_ratio_pct}% | ${formatCurrency(finance.baseline?.remaining_income)} |\n`;
  report += `| **Negotiated Target** | ${formatCurrency(finance.scenarios?.negotiated_price?.monthly_payment)} | ${finance.scenarios?.negotiated_price?.debt_ratio_pct}% | ${formatCurrency(finance.scenarios?.negotiated_price?.remaining_income)} |\n`;
  if (finance.scenarios?.partial_rent_recognition) {
    report += `| **Investment Pivot** | ${formatCurrency(finance.scenarios?.partial_rent_recognition?.monthly_payment)} | ${finance.scenarios?.partial_rent_recognition?.debt_ratio_pct}% | ${formatCurrency(finance.scenarios?.partial_rent_recognition?.remaining_income)} |\n`;
  }
  
  report += `\n### C. Risk Indicators\n`;
  report += `* **Data Confidence:** ${analysis.scores.data_confidence_score}/100\n`;
  report += `* **Execution Risk:** ${analysis.scores.execution_score}/100\n`;
  report += `* **Identified Red Flags:**\n`;
  analysis.red_flags?.forEach(flag => {
    report += `  - 🚩 ${flag}\n`;
  });

  return report;
}
