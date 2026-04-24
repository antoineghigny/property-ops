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
  report += `> Generated on: ${new Date().toLocaleDateString()} | Status: ${analysis.decisions.verdict.toUpperCase()}\n\n`;

  report += `## 🎯 DECISION DASHBOARD\n\n`;
  report += `| Dimension | Score | Metric | Status |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;
  report += `| **GLOBAL VERDICT** | **${analysis.decisions.recommendation_band.toUpperCase()}** | **${analysis.decisions.verdict.replace('_', ' ').toUpperCase()}** | ${analysis.decisions.verdict === 'ignore' ? '🛑 **DO NOT PROCEED**' : '🟢 **PROCEED**'} |\n`;
  report += `| **Value Check** | ${finance.acquisition_costs.is_value_trap ? '🚨 TRAP' : '✅ OK'} | ${formatCurrency(finance.acquisition_costs.project_cost_per_m2)}/m2 | ${finance.acquisition_costs.is_value_trap ? 'Exceeds Market' : 'Below Market'} |\n`;
  report += `| **Liquidity** | ${finance.capital_requirements.asset_gap > 0 ? '🛑 MISSING' : '✅ OK'} | ${formatCurrency(finance.capital_requirements.asset_gap || 0)} Gap | ${finance.capital_requirements.asset_gap > 0 ? 'Infeasible' : 'Capital Ready'} |\n`;
  report += `| **Risk Level** | ${analysis.scores.risk_score}/100 | PEB/EPC: ${peb} | ${['A', 'B', 'C'].includes(peb) ? '✅ Prime' : '⚠️ Technical Debt'} |\n\n`;

  report += `## ⚖️ RISK & OPPORTUNITY MATRIX\n`;
  report += `### Technical & Market Risks\n`;
  const dealBreakers = analysis.deal_breakers || [];
  if (dealBreakers.length > 0) {
    dealBreakers.forEach(db => report += `- 🛑 **DEAL BREAKER: ${db}**\n`);
  }
  const redFlags = analysis.red_flags || [];
  if (redFlags.length > 0) {
    redFlags.forEach(flag => report += `- 🚩 **${flag}**\n`);
  }
  
  report += `\n### Strategic Opportunities\n`;
  const localInsights = analysis.market_context?.local_insights || [];
  if (localInsights.length > 0) {
    localInsights.forEach(insight => report += `- ✅ ${insight}\n`);
  }
  report += `\n---\n\n`;

  report += `## 📈 POST-RENOVATION EQUITY AUDIT (TERMINAL VALUE)\n`;
  const terminalValuePerM2 = pricing.intrinsic_value_per_m2 * 1.15; // Assumption: Renovated PEB A/B premium
  const terminalValue = livingArea * terminalValuePerM2;
  const equityGain = terminalValue - finance.acquisition_costs.total_project_cost;

  report += `| Metric | Value | Comment |\n`;
  report += `| :--- | :--- | :--- |\n`;
  report += `| **Total Project Cost (Revient)** | ${formatCurrency(finance.acquisition_costs.total_project_cost)} | Total investment incl. structural works |\n`;
  report += `| **Est. Terminal Value (Market)** | ${formatCurrency(terminalValue)} | Market value for renovated ${peb}->B standard |\n`;
  report += `| **PROJECTED EQUITY GAIN** | **${formatCurrency(equityGain)}** | **${equityGain > 0 ? '💰 VALUE CREATION' : '📉 VALUE DESTRUCTION'}** |\n\n`;

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

  report += `## 🏗️ TECHNICAL & VISUAL AUDIT\n`;
  report += `- **Energy Compliance:** EPC ${peb} provides a technical liability in the current regulatory environment.\n`;
  report += `- **Works Provision:** Our model has allocated **${formatCurrency(analysis.derived_metrics.works.immediate_works_estimate)}** for immediate refresh and technical compliance (Tier: ${caseData.typology.condition_kind?.toUpperCase()}).\n`;
  report += `- **Expert Observation:** Visual audit confirms a **${caseData.typology.condition_kind === 'structural_renovation' ? 'STRIPPED SHELL' : 'standard'}** state, justifying the aggressive works contingency.\n`;

  return report;
}
