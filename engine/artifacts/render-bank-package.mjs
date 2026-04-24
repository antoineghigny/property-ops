import { renderTemplate } from '../shared/render.mjs';
import { formatCurrency, round } from '../shared/utils.mjs';

function list(items) {
  return (items || []).map(item => `<li>${item}</li>`).join('');
}

function tableRows(rows) {
  return rows.map(row => `<tr><th>${row.label}</th><td>${row.value}</td></tr>`).join('');
}

export function renderBankPackageHtml(caseData, analysis, profile) {
  const finance = analysis.derived_metrics.finance;
  const pricing = analysis.derived_metrics.pricing;
  const contentHtml = `
    <div class="page">
      <div class="hero">
        <h1>Property-Ops Bank Package</h1>
        <div class="muted">Case: ${caseData.case_id} | Generated: ${analysis.generated_at}</div>
      </div>

      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="card"><div class="metric">Verdict</div><div class="value">${analysis.decisions.verdict}</div></div>
        <div class="card"><div class="metric">Recommendation</div><div class="value">${analysis.decisions.recommendation_band}</div></div>
        <div class="card"><div class="metric">Purchase price</div><div class="value">${formatCurrency(finance.acquisition_costs.purchase_price)}</div></div>
        <div class="card"><div class="metric">Total project cost</div><div class="value">${formatCurrency(finance.acquisition_costs.total_project_cost)}</div></div>
        <div class="card"><div class="metric">Loan amount</div><div class="value">${formatCurrency(finance.baseline.loan_amount)}</div></div>
        <div class="card"><div class="metric">Monthly payment</div><div class="value">${formatCurrency(finance.baseline.monthly_payment)}</div></div>
      </div>

      <h2>Borrower Profile</h2>
      <table>
        ${tableRows([
          { label: 'Borrower', value: `${profile.borrower.identity.first_name || ''} ${profile.borrower.identity.last_name || ''}`.trim() },
          { label: 'Civil status', value: profile.borrower.identity.civil_status || 'unknown' },
          { label: 'Employer', value: profile.borrower.employment?.employer || 'unknown' },
          { label: 'Function', value: profile.borrower.employment?.function_title || 'unknown' },
          { label: 'Net monthly income', value: formatCurrency(profile.borrower.income?.net_monthly) },
          { label: 'Own funds mobilizable', value: formatCurrency(profile.borrower.assets?.own_funds_mobilizable) },
        ])}
      </table>

      <h2>Property Summary</h2>
      <table>
        ${tableRows([
          { label: 'Title', value: caseData.listing.title || 'unknown' },
          { label: 'Address', value: caseData.identity.normalized_address || caseData.identity.raw_address || 'unknown' },
          { label: 'Municipality', value: caseData.identity.municipality || 'unknown' },
          { label: 'Region', value: caseData.identity.region || 'unknown' },
          { label: 'Property type', value: caseData.typology.property_kind || 'unknown' },
          { label: 'Living area', value: caseData.typology.living_area_m2 ? `${caseData.typology.living_area_m2} m²` : 'unknown' },
          { label: 'Energy label', value: caseData.energy?.label || 'unknown' },
        ])}
      </table>

      <h2>Price and Costs</h2>
      <table>
        ${tableRows([
          { label: 'Asking price', value: formatCurrency(finance.acquisition_costs.purchase_price) },
          { label: 'Target price', value: formatCurrency(pricing.target_price) },
          { label: 'Registration duties', value: formatCurrency(finance.acquisition_costs.registration_duties) },
          { label: 'Purchase deed costs (estimate)', value: formatCurrency(finance.acquisition_costs.purchase_deed_cost_estimate) },
          { label: 'Mortgage deed costs (estimate)', value: formatCurrency(finance.acquisition_costs.mortgage_deed_cost_estimate) },
          { label: 'Immediate works', value: formatCurrency(finance.acquisition_costs.immediate_works) },
          { label: 'Contingency reserve', value: formatCurrency(finance.acquisition_costs.contingency_reserve) },
          { label: 'Total project cost', value: formatCurrency(finance.acquisition_costs.total_project_cost) },
          { label: 'Total cash out', value: formatCurrency(finance.acquisition_costs.total_cash_out) },
        ])}
      </table>

      <h2>Financing Requested</h2>
      <table>
        ${tableRows([
          { label: 'Loan amount', value: formatCurrency(finance.baseline.loan_amount) },
          { label: 'Duration', value: `${finance.financeability.duration_years} years` },
          { label: 'Rate assumption', value: `${round(finance.financeability.rate_pct, 2)}%` },
          { label: 'Monthly payment', value: formatCurrency(finance.baseline.monthly_payment) },
          { label: 'Quotity / LTV', value: finance.financeability.quotity_pct === null ? 'unknown' : `${round(finance.financeability.quotity_pct, 1)}%` },
          { label: 'Debt ratio', value: finance.financeability.debt_ratio_pct === null ? 'unknown' : `${round(finance.financeability.debt_ratio_pct, 1)}%` },
          { label: 'Remaining income', value: formatCurrency(finance.financeability.remaining_income) },
          { label: 'Finance verdict', value: finance.financeability.verdict },
        ])}
      </table>

      <h2>Risk Analysis</h2>
      <ul>
        ${list(analysis.decisions.red_flags)}
      </ul>

      <h2>Document Checklist</h2>
      <div class="two-col">
        <div class="card">
          <div class="metric">Required by law</div>
          <ul>${list(analysis.documents.required_by_law)}</ul>
        </div>
        <div class="card">
          <div class="metric">Required by lender</div>
          <ul>${list(analysis.documents.required_by_lender)}</ul>
        </div>
      </div>

      <h2>Missing Items</h2>
      <ul>${list(analysis.documents.missing)}</ul>

      <h2>Manual Review Items</h2>
      <ul>${list(analysis.manual_reviews)}</ul>
    </div>
  `;

  return renderTemplate('bank-package.html', { contentHtml });
}

export function renderBankPackageMarkdown(caseData, analysis, profile) {
  const finance = analysis.derived_metrics.finance;
  return `# Bank Package: ${caseData.case_id}

Generated at: ${analysis.generated_at}

## Executive Summary

- Verdict: ${analysis.decisions.verdict}
- Recommendation band: ${analysis.decisions.recommendation_band}
- Purchase price: ${formatCurrency(finance.acquisition_costs.purchase_price)}
- Total project cost: ${formatCurrency(finance.acquisition_costs.total_project_cost)}
- Loan amount: ${formatCurrency(finance.baseline.loan_amount)}
- Monthly payment: ${formatCurrency(finance.baseline.monthly_payment)}

## Borrower Profile

- Borrower: ${(profile.borrower.identity.first_name || '')} ${(profile.borrower.identity.last_name || '')}
- Employer: ${profile.borrower.employment?.employer || 'unknown'}
- Net monthly income: ${formatCurrency(profile.borrower.income?.net_monthly)}
- Own funds mobilizable: ${formatCurrency(profile.borrower.assets?.own_funds_mobilizable)}

## Property Summary

- Title: ${caseData.listing.title || 'unknown'}
- Address: ${caseData.identity.normalized_address || caseData.identity.raw_address || 'unknown'}
- Municipality: ${caseData.identity.municipality || 'unknown'}
- Region: ${caseData.identity.region || 'unknown'}
- Type: ${caseData.typology.property_kind || 'unknown'}
- Living area: ${caseData.typology.living_area_m2 || 'unknown'}
- Energy label: ${caseData.energy?.label || 'unknown'}

## Risk Analysis

${analysis.decisions.red_flags.map(item => `- ${item}`).join('\n')}

## Missing Items

${analysis.documents.missing.map(item => `- ${item}`).join('\n')}
`;
}
