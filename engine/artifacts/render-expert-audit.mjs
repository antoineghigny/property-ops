import { formatCurrency, round } from '../shared/utils.mjs';

/**
 * GENERATES A COMPREHENSIVE EXPERT PROPERTY AUDIT
 * Combines Corporate Expansion analysis with Skeptical Property Hunter mindset.
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

  let report = `# 🏛️ EXPERT PROPERTY AUDIT: ${caseData.case_id.toUpperCase()}\n`;
  report += `> Generated on: ${new Date().toLocaleDateString()} | Status: ${analysis.decisions.verdict.toUpperCase()}\n\n`;

  report += `## 🎯 DECISION DASHBOARD\n\n`;
  report += `| Dimension | Score | Metric | Status |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;
  report += `| **GLOBAL VERDICT** | **${analysis.decisions.recommendation_band.toUpperCase()}** | **${analysis.decisions.verdict.replace('_', ' ').toUpperCase()}** | ${analysis.decisions.verdict === 'ignore' ? '🔴 **REJECTED**' : '🟢 **PROCEED**'} |\n`;
  report += `| **Acquisition Basis** | ${isBidding ? '⚠️ Bidding Sale' : '✅ Standard'} | ${formatCurrency(purchasePrice)} | ${isBidding ? 'Incl. 15% Est. Premium' : 'Asking Price'} |\n`;
  report += `| **Deal Score** | ${analysis.scores.deal_score}/100 | ${formatCurrency(pricing.asking_price_per_m2)}/m2 | ${pricing.relative_market_gap_pct < 0 ? '✅ Under Market' : '⚠️ Over Market'} |\n`;
  report += `| **Finance Fit** | ${analysis.scores.finance_fit_score}/100 | ${finance.baseline?.debt_ratio_pct}% DTI | ${finance.financeability.verdict === 'financeable' ? '✅ Strong' : '⚠️ Strategy-Dependent'} |\n`;
  report += `| **Risk Level** | ${analysis.scores.risk_score}/100 | PEB/EPC: ${peb} | ${['A', 'B', 'C'].includes(peb) ? '✅ High-Performance' : '⚠️ Upgrade Needed'} |\n\n`;

  report += `## 🚫 THE "WHY NOT" (CRITICAL REJECTION FACTORS)\n`;
  report += `*Before looking at the upside, here are the primary reasons to walk away from this deal:*\n`;
  if (isBidding) {
    report += `- 🚩 **Price Trap:** This is a "Faire offre à partir de" listing. The final closing price is estimated at **${formatCurrency(purchasePrice)}**, significantly impacting yield.\n`;
  }
  const redFlags = analysis.red_flags || [];
  if (redFlags.length > 0) {
    redFlags.forEach(flag => report += `- 🚩 **${flag}**\n`);
  }
  report += `\n---\n\n`;

  report += `## 📊 EXECUTIVE SUMMARY: THE "WHY"\n`;
  const marketContextText = pricing.relative_market_gap_pct < -15 
    ? 'significant technical anomaly' 
    : (pricing.relative_market_gap_pct < 0 ? 'solid value opportunity' : 'standard market entry');
  report += `This property is analyzed as a **${marketContextText}**. ${isBidding ? `While the starting price is attractive, the high-conviction valuation basis is ${formatCurrency(purchasePrice)}.` : ''} Combining an energy rating of **EPC ${peb}** with a **${Math.abs(round(pricing.relative_market_gap_pct, 1))}% market ${pricing.relative_market_gap_pct < 0 ? 'discount' : 'premium'}** requires a high-conviction strategic pivot.\n\n`;

  report += `## 🏢 CORPORATE FEASIBILITY: LOCAL ECONOMY & DEMAND\n`;
  const localInsights = analysis.market_context?.local_insights || [];
  if (localInsights.length > 0) {
    localInsights.forEach(insight => report += `- ${insight}\n`);
  } else {
    report += `- No specific local insights found. A deep manual search of employment hubs (Biotech, Tech, Logistics) is required.\n`;
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
  report += `| **Realistic Purchase Basis** | ${formatCurrency(purchasePrice)} | -- | ${isBidding ? 'Incl. bidding premium' : 'Asking Price'} |\n`;
  report += `| **Gross Rental Income** | ${formatCurrency(annualGrossRent)} | ${formatCurrency(grossRent)} | Strategy-Specific Estimate |\n`;
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
  report += `- **Energy Status:** EPC ${peb} provides a ${['A', 'B'].includes(peb) ? 'strong competitive moat' : 'significant technical liability'} in the current regulatory environment.\n`;
  report += `- **Works Provision:** Our model has allocated **${formatCurrency(analysis.derived_metrics.works.immediate_works_estimate)}** for immediate refresh and technical compliance.\n`;
  report += `- **Visual Cues:** Based on listing photos, attention should be paid to technical systems (electricity/boiler) and potential dampness in lower levels.\n`;

  report += `\n## 🚀 THE ATTACK PLAN: NEGOTIATION LEVERS\n`;
  report += `1. **Valuation Play:** At ${formatCurrency(pricing.asking_price_per_m2)}/m2, the asset valuation is derived from **${pricing.valuation_source}**.\n`;
  report += `2. **Urbanistic Conformity:** Verify if the official layout matches the recognized permit to avoid regularization risks.\n`;
  report += `3. **Market Staleness:** Use technical flaws and nuisance reports to justify an aggressive price reduction.\n`;

  return report;
}
