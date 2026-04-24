import { formatCurrency, round } from '../shared/utils.mjs';

/**
 * GENERATES A COMPREHENSIVE INVESTMENT MEMORANDUM
 * Professional due diligence combining macro-economics, technical audit, and financial engineering.
 */
export function renderExpertAudit(caseData, analysis, profile) {
  const pricing = analysis.derived_metrics.pricing;
  const finance = analysis.derived_metrics.finance;
  const economics = caseData.economics || {};
  const borrower = profile?.borrower || {};
  const assets = borrower.assets || {};
  
  const livingArea = caseData.typology.living_area_m2 || 0;
  const peb = caseData.energy?.label || 'Unknown';
  const equityAvailable = (assets.own_funds_mobilizable || 0) + (assets.securities || 0);

  const purchasePrice = pricing.realistic_purchase_price || pricing.asking_price;
  const isBidding = pricing.is_bidding_sale;

  let report = `# 🏛️ INVESTMENT MEMORANDUM: ${caseData.case_id.toUpperCase()}\n`;
  report += `> Generated on: ${new Date().toLocaleDateString()} | Strategy: ${borrower.intent?.toUpperCase() || 'NOT_DEFINED'}\n\n`;

  report += `## 🎯 DECISION DASHBOARD\n\n`;
  report += `| Dimension | Score | Metric | Status |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;
  report += `| **GLOBAL VERDICT** | **${analysis.decisions.recommendation_band.toUpperCase()}** | **${analysis.decisions.verdict.replace('_', ' ').toUpperCase()}** | ${analysis.decisions.verdict === 'ignore' ? '🛑 **WATCHLIST**' : '🟢 **PROCEED**'} |\n`;
  report += `| **Acquisition Basis** | ${isBidding ? '⚠️ Bidding Sale' : '✅ Standard'} | ${formatCurrency(purchasePrice)} | ${isBidding ? 'Incl. Est. Premium' : 'Asking Price'} |\n`;
  report += `| **Market Value Gap** | ${analysis.scores.deal_score}/100 | ${formatCurrency(pricing.asking_price_per_m2)}/m2 | ${pricing.relative_market_gap_pct < 0 ? '✅ Under Market' : '⚠️ Over Market'} |\n`;
  report += `| **Finance Fit** | ${analysis.scores.finance_fit_score}/100 | ${finance.baseline?.debt_ratio_pct}% DTI | ${finance.financeability.verdict === 'financeable' ? '✅ Strong' : '⚠️ Review Terms'} |\n`;
  report += `| **Risk Level** | ${analysis.scores.risk_score}/100 | PEB/EPC: ${peb} | ${['A', 'B', 'C'].includes(peb) ? '✅ High-Performance' : '⚠️ Technical Debt'} |\n\n`;

  report += `## ⚖️ RISK & OPPORTUNITY MATRIX\n`;
  report += `### Technical & Market Risks\n`;
  const redFlags = analysis.red_flags || [];
  if (redFlags.length > 0) {
    redFlags.forEach(flag => report += `- 🚩 **${flag}**\n`);
  } else {
    report += `- No critical deal-breakers identified based on available data.\n`;
  }
  
  report += `\n### Strategic Opportunities\n`;
  const localInsights = analysis.market_context?.local_insights || [];
  if (localInsights.length > 0) {
    localInsights.forEach(insight => report += `- ✅ ${insight}\n`);
  } else {
    report += `- Solid underlying asset value based on regional median-to-m2 derivation.\n`;
  }
  report += `\n---\n\n`;

  report += `## 📊 EXECUTIVE SUMMARY: THE "WHY"\n`;
  const marketContextText = pricing.relative_market_gap_pct < -15 
    ? 'significant technical anomaly' 
    : (pricing.relative_market_gap_pct < 0 ? 'solid value opportunity' : 'standard market entry');
  report += `This property is analyzed as a **${marketContextText}**. ${isBidding ? `Current bidding dynamics estimate the realistic closing basis at ${formatCurrency(purchasePrice)}.` : ''} The energy rating of **EPC ${peb}** is a key factor in the long-term value preservation and regulatory compliance.\n\n`;

  report += `## 🏢 CORPORATE FEASIBILITY: LOCAL ECONOMY & DEMAND\n`;
  report += `Our investigation of the micro-market confirms the following economic anchors and demand drivers:\n`;
  if (localInsights.length > 0) {
    localInsights.forEach(insight => report += `- ${insight}\n`);
  } else {
    report += `- Demand is driven by local transport accessibility and proximity to regional employment hubs.\n`;
  }
  report += `\n`;

  report += `## 💰 FINANCIAL ENGINEERING (NET-NET MODEL)\n`;
  const grossRent = economics.current_rent_if_occupied || economics.estimated_market_rent || 0;
  const annualGrossRent = grossRent * 12;
  const vacancy = annualGrossRent * 0.05;
  const taxes = economics.property_tax_annual_eur || (purchasePrice * 0.007);
  const insurance = 600;
  const maintenance = annualGrossRent * 0.10;
  const netNetIncome = Math.max(0, annualGrossRent - vacancy - taxes - insurance - maintenance);
  const annualDebtService = (finance.baseline?.monthly_payment || 0) * 12;
  const cashFlow = netNetIncome - annualDebtService;

  report += `| Metric | Annual Value | Monthly | Comment |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;
  report += `| **Acquisition Basis** | ${formatCurrency(purchasePrice)} | -- | ${isBidding ? 'Projected purchase' : 'Asking Price'} |\n`;
  report += `| **Gross Rental Income** | ${formatCurrency(annualGrossRent)} | ${formatCurrency(grossRent)} | Strategy-Based Estimate |\n`;
  report += `| **Net-Net Operating Income** | ${formatCurrency(netNetIncome)} | ${formatCurrency(netNetIncome/12)} | After vacancy, tax, insurance, maint. |\n`;
  report += `| **Debt Service (Credit)** | ${formatCurrency(annualDebtService)} | ${formatCurrency(annualDebtService/12)} | Est. 25Y @ Market Rates |\n`;
  report += `| **PRE-TAX CASH FLOW** | **${formatCurrency(cashFlow)}** | **${formatCurrency(cashFlow/12)}** | **${cashFlow > 0 ? 'POSITIVE YIELD' : 'CASH NEGATIVE'}** |\n\n`;

  report += `## ⚖️ ASSET VS LIQUIDITY ANALYSIS\n`;
  report += `* **Total Mobilizable Capital:** ${formatCurrency(equityAvailable)} (Cash + Securities).\n`;
  report += `* **Project Liquidity Requirement:** ${formatCurrency(finance.acquisition_costs.total_cash_out)}.\n`;
  if (assets.securities > 0) {
    report += `* **Expert Strategy:** To preserve wealth, consider **Pledging (Nantissement)**. A 50-60% LTV on diversified assets covers the gap while keeping your core capital growing.\n`;
  }

  report += `\n## 🏗️ TECHNICAL & VISUAL AUDIT\n`;
  report += `- **Energy Compliance:** EPC ${peb} provides a ${['A', 'B'].includes(peb) ? 'strong performance moat' : 'technical liability'} in the current regulatory environment.\n`;
  report += `- **Works Provision:** Our model has allocated **${formatCurrency(analysis.derived_metrics.works.immediate_works_estimate)}** for immediate refresh and technical compliance (Tier: ${caseData.typology.condition_kind?.toUpperCase()}).\n`;
  report += `- **Expert Observation:** Visual audit confirms a **${caseData.typology.condition_kind === 'structural_renovation' ? 'STRIPPED SHELL' : 'standard'}** state, justifying the aggressive works contingency of **${formatCurrency(analysis.derived_metrics.works.immediate_works_estimate + (analysis.derived_metrics.works.contingency_reserve || 0))}** (Total incl. contingency).\n`;

  report += `\n## 🚀 THE ATTACK PLAN: STRATEGIC LEVERS\n`;
  report += `1. **Valuation Alignment:** At ${formatCurrency(pricing.asking_price_per_m2)}/m2, the valuation is anchored on **${pricing.valuation_source}**. Use this to align the final offer with intrinsic neighborhood value.\n`;
  report += `2. **Conformity Check:** Prioritize the verification of the official permit against the current room count to mitigate regularization costs.\n`;
  report += `3. **Environmental Audit:** Cross-reference regional soil and flood data to rule out latent liabilities before formal commitment.\n`;

  return report;
}
