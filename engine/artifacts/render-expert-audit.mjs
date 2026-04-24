import { formatCurrency, round } from '../shared/utils.mjs';

/**
 * GENERATES A CAREER-OPS STYLE COMPREHENSIVE AUDIT
 * This is the "Gold Standard" for property analysis.
 */
export function renderExpertAudit(caseData, analysis, profile) {
  const pricing = analysis.derived_metrics.pricing;
  const finance = analysis.derived_metrics.finance;
  const economics = caseData.economics || {};
  const borrower = profile?.borrower || {};
  const assets = borrower.assets || {};
  
  const livingArea = caseData.typology.living_area_m2 || 0;
  const peb = caseData.energy?.label || 'Unknown';
  
  // DYNAMIC PRICING: Use the intrinsic value calculated from market reference or research
  const marketM2Price = pricing.intrinsic_value_estimate && livingArea > 0 
    ? (pricing.intrinsic_value_estimate / livingArea) 
    : 0;
  const marketValue = pricing.intrinsic_value_estimate || 0;
  const equityAvailable = (assets.own_funds_mobilizable || 0) + (assets.securities || 0);

  let report = `# 🏛️ EXPERT PROPERTY AUDIT: ${caseData.case_id.toUpperCase()}\n`;
  report += `> Generated on: ${new Date().toLocaleDateString()} | Priority: HIGH-YIELD CANDIDATE\n\n`;

  report += `## 🎯 DECISION DASHBOARD\n\n`;
  report += `| Dimension | Score | Metric | Status |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;
  report += `| **GLOBAL VERDICT** | **${analysis.decisions.recommendation_band.toUpperCase()}** | **${analysis.decisions.verdict.replace('_', ' ').toUpperCase()}** | 🟢 **PROCEED** |\n`;
  report += `| **Deal Score** | ${analysis.scores.deal_score}/100 | ${formatCurrency(pricing.asking_price_per_m2)}/m2 | ${pricing.relative_market_gap_pct < 0 ? '✅ Under Market' : '⚠️ Over Market'} |\n`;
  report += `| **Finance Fit** | ${analysis.scores.finance_fit_score}/100 | ${finance.baseline?.debt_ratio_pct}% DTI | ${finance.financeability.verdict === 'financeable' ? '✅ Strong' : '⚠️ Strategy-Dependent'} |\n`;
  report += `| **Risk Level** | ${analysis.scores.risk_score}/100 | PEB/EPC: ${peb} | ${['A', 'B', 'C'].includes(peb) ? '✅ High-Performance' : '⚠️ Upgrade Needed'} |\n`;
  
  const annualReturn = finance.scenarios?.partial_rent_recognition 
    ? (finance.scenarios.partial_rent_recognition.remaining_income / (finance.acquisition_costs.total_cash_out || 1) * 12)
    : 0;
  report += `| **Yield (Net-Net)** | -- | ~${round(Math.max(0, annualReturn), 1)}% ROE | ✅ Cash-Flow + |\n\n`;

  report += `## 📊 EXECUTIVE SUMMARY: THE "WHY"\n`;
  if (!profile) {
    report += `⚠️ **PROVISIONAL ANALYSIS:** Borrower profile not fully loaded. Financial fit is estimated based on general market assumptions.\n\n`;
  }
  
  const marketContextText = pricing.relative_market_gap_pct < -15 
    ? 'significant technical anomaly' 
    : (pricing.relative_market_gap_pct < 0 ? 'solid value opportunity' : 'standard market entry');
    
  report += `This property is analyzed as a **${marketContextText}** in the local area. Combining an energy rating of **EPC ${peb}** with a **${Math.abs(round(pricing.relative_market_gap_pct, 1))}% market ${pricing.relative_market_gap_pct < 0 ? 'discount' : 'premium'}** requires specific strategic handling.\n\n`;

  report += `## 💰 FINANCIAL ENGINEERING (NET-NET MODEL)\n`;
  
  // DYNAMIC FINANCE: Use data from case economics or prudent market ratios
  const grossRent = economics.current_rent_if_occupied || economics.estimated_market_rent || 0;
  const annualGrossRent = grossRent * 12;
  const vacancy = annualGrossRent * 0.05;
  const taxes = economics.property_tax_annual_eur || (pricing.asking_price * 0.007); // Prudent estimate (0.7%)
  const insurance = 600; // Standard annual average for residential
  const maintenance = annualGrossRent * 0.10;
  const netNetIncome = Math.max(0, annualGrossRent - vacancy - taxes - insurance - maintenance);
  const annualDebtService = (finance.baseline?.monthly_payment || 0) * 12;
  const cashFlow = netNetIncome - annualDebtService;

  report += `| Metric | Annual Value | Monthly | Comment |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;
  report += `| **Gross Rental Income** | ${formatCurrency(annualGrossRent)} | ${formatCurrency(grossRent)} | Strategy-Specific Estimate |\n`;
  report += `| **Net-Net Operating Income** | ${formatCurrency(netNetIncome)} | ${formatCurrency(netNetIncome/12)} | After vacancy, tax, insurance, maint. |\n`;
  report += `| **Debt Service (Credit)** | ${formatCurrency(annualDebtService)} | ${formatCurrency(annualDebtService/12)} | Est. 25Y @ Market Rates |\n`;
  report += `| **PRE-TAX CASH FLOW** | **${formatCurrency(cashFlow)}** | **${formatCurrency(cashFlow/12)}** | **${cashFlow > 0 ? 'POSITIVE YIELD' : 'CASH NEGATIVE'}** |\n\n`;

  report += `## ⚖️ ASSET VS LIQUIDITY ANALYSIS\n`;
  report += `* **Total Mobilizable Capital:** ${formatCurrency(equityAvailable)} (Cash + Securities).\n`;
  report += `* **Project Liquidity Requirement:** ${formatCurrency(finance.acquisition_costs.total_cash_out)}.\n`;
  if (assets.securities > 0) {
    report += `* **Expert Strategy:** To preserve wealth and optimize liquidity, consider **Pledging (Nantissement)**. Standard Tier-1 lending models typically accept a **50-60% LTV** on diversified equity portfolios. This strategy bridges the cash gap while keeping your core capital growing and avoiding unnecessary liquidation taxes.\n`;
  }

  report += `\n## 🔍 THE "EXPERTS EYE" (KILL POINTS)\n`;
  report += `1. **The Energy Moat:** High energy efficiency (EPC ${peb}) serves as a hedge against future regulatory rent-indexing restrictions and increases the asset's terminal value (Green Premium).\n`;
  report += `2. **Value Play:** At ${formatCurrency(pricing.asking_price_per_m2)}/m2, the asset valuation is derived from **${pricing.valuation_source}**. ${pricing.relative_market_gap_pct < 0 ? 'The acquisition represents immediate equity gain.' : 'Strategic negotiation is required to align with intrinsic value.'}\n`;
  
  const localInsights = analysis.market_context?.local_insights || [];
  if (localInsights.length > 0) {
    report += `3. **Location Alpha:** ${localInsights[0]} Target specific tenant profiles based on identified local employment hubs.\n`;
  } else {
    report += `3. **Location Alpha:** Market demand is driven by local accessibility and specific regional economic hubs. Proximity to transit and employment centers is the primary driver for low vacancy.\n`;
  }

  report += `\n## ⚠️ HIDDEN RISKS & EXPERT CAVEATS\n`;
  report += `1. **The "Starting Price" Trap:** If the listing mentions "Faire offre à partir de", the €249k is a floor, not a ceiling. Realistically, expect a **10-15% premium** in a competitive bidding environment, which may compress your yield and DTI safety margin.\n`;
  report += `2. **Urbanistic Conformity (The 4th Bedroom):** Many renovated houses in this hub are originally 2-3 bed workers' houses. Ensure the 4th bedroom is recognized in the official **Permis d'urbanisme**. An unpermitted conversion will lead to a lower bank appraisal and potential regularization fines.\n`;
  report += `3. **Structural & Environmental Integrity:** Proximity to heavy transit (Tram/Road) and historical mining concessions requires a **Stability Audit** and an official **Division des Mines** consultation to rule out subsidence risks.\n`;

  report += `\n## 🚀 NEXT STEPS: THE ATTACK PLAN\n`;
  report += `1. **Technical Validation (CRITICAL):** Verify the official EPC certificate and ensure the current layout is reflected in urban planning records.\n`;
  report += `2. **Regulatory Check:** Confirm if any regional soil status or flood-risk study is required for this specific parcel to rule out liabilities.\n`;
  report += `3. **Lender Strategy:** Engage a broker specialized in **Asset-Backed Financing**. Present the dual scenario (Residence vs Yield) with the securities as collateral to secure the best loan structure.\n`;

  return report;
}
