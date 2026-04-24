import { computeMonthlyMortgagePayment, formatCurrency, round } from '../shared/utils.mjs';

function selectRate(strategyMode) {
  return strategyMode === 'yield' ? 4.0 : 3.5;
}

function registrationDuty(caseData, regionPacks, strategyMode) {
  const askingPrice = caseData.economics.asking_price || 0;
  const regPack = regionPacks.filter(pack => pack.kind === 'registration_duties').at(-1);
  if (!regPack) return { amount: null, applied_rate_pct: null, note: 'unknown' };
  const rules = regPack.rules || {};

  if (caseData.identity.region === 'BRU' && strategyMode === 'home') {
    const cap = Number(rules.abatement_property_price_cap_eur || 0);
    const abatement = Number(rules.abatement_amount_eur || 0);
    const rate = Number(rules.default_rate_pct || 0);
    const taxableBase = cap && askingPrice <= cap ? Math.max(0, askingPrice - abatement) : askingPrice;
    return { amount: round(taxableBase * rate / 100, 0), applied_rate_pct: rate, note: 'Brussels abatement logic applied' };
  }

  const reducedRate = Number(rules.owner_occupied_unique_home_rate_pct || 0);
  const defaultRate = Number(rules.default_rate_pct || 0);
  const rate = strategyMode === 'home' && reducedRate ? reducedRate : defaultRate;
  return { amount: round(askingPrice * rate / 100, 0), applied_rate_pct: rate, note: strategyMode === 'home' && reducedRate ? 'Reduced owner-occupied logic applied' : 'Default regional rate applied' };
}

function addIfKnown(values) {
  if (values.some(value => value === null || value === undefined || Number.isNaN(Number(value)))) {
    return null;
  }
  return values.reduce((total, value) => total + Number(value), 0);
}

function monthlyPaymentIfKnown(principal, annualRatePct, durationYears) {
  if (principal === null || principal === undefined) return null;
  return round(computeMonthlyMortgagePayment(principal, annualRatePct, durationYears), 0);
}

export function calculateFinance(caseData, profile, strategy, regionPacks, lenderPack, pricing, works) {
  const askingPrice = caseData.economics.asking_price || 0;
  const profileStatus = profile.status || {};
  const borrowerProfileReady = profileStatus.is_finance_ready === true;
  
  const mobilizableCash = borrowerProfileReady ? Number(profile.borrower.assets?.own_funds_mobilizable || 0) : 0;
  const securities = borrowerProfileReady ? Number(profile.borrower.assets?.securities || 0) : 0;
  const savingsToKeep = borrowerProfileReady ? Number(profile.borrower.assets?.own_funds_to_keep_untouched || 0) : 0;
  
  const availableForProject = Math.max(0, mobilizableCash - savingsToKeep);
  const totalAssetsAvailable = Math.max(0, mobilizableCash + securities - savingsToKeep);
  
  const strategyMode = strategy.strategy.mode || 'home';
  const duty = registrationDuty(caseData, regionPacks, strategyMode);
  const ratePct = selectRate(strategyMode);
  const durationYears = strategy.strategy.duration_preference_years?.[0] || 25;
  const strategyMaxMonthly = Number(strategy.strategy.max_bank_monthly_payment || 0) || null;

  const purchaseDeedCostEstimate = round(askingPrice * 0.025, 0);
  
  // DYNAMIC FEES: Read from lender pack rules with safe fallbacks
  const bankFileFeeEstimate = Number(lenderPack?.rules?.bank_file_fee_eur || 500);
  const valuationFeeEstimate = Number(lenderPack?.rules?.valuation_fee_eur || 300);
  const insuranceSetupEstimate = Number(lenderPack?.rules?.insurance_setup_fee_eur || 900);
  
  const immediateWorks = Number(works.immediate_works_estimate || 0);
  const works12Months = Number(works.works_12_months_estimate || 0);
  const contingency = round((immediateWorks + works12Months) * 0.1, 0);

  const cashOutWithoutLoan = addIfKnown([
    duty.amount,
    purchaseDeedCostEstimate,
    bankFileFeeEstimate,
    valuationFeeEstimate,
    insuranceSetupEstimate,
    immediateWorks,
    contingency,
  ]);
  
  const minimumBankRequirement = cashOutWithoutLoan !== null ? cashOutWithoutLoan + round(askingPrice * 0.1, 0) : null;
  const cashGap = minimumBankRequirement !== null ? Math.max(0, minimumBankRequirement - availableForProject) : null;
  const assetGap = minimumBankRequirement !== null ? Math.max(0, minimumBankRequirement - totalAssetsAvailable) : null;

  const ownContributionToPrice = cashOutWithoutLoan === null ? null : Math.max(0, totalAssetsAvailable - cashOutWithoutLoan);
  const loanAmount = ownContributionToPrice === null ? null : Math.max(0, askingPrice - ownContributionToPrice);
  const mortgageDeedCostEstimate = loanAmount === null ? null : round(loanAmount * 0.015, 0);
  const totalProjectCost = addIfKnown([askingPrice, cashOutWithoutLoan, mortgageDeedCostEstimate]);
  const totalCashOut = totalProjectCost === null || loanAmount === null ? null : totalProjectCost - loanAmount;

  const monthlyPayment = monthlyPaymentIfKnown(loanAmount, ratePct, durationYears);
  
  let householdNet = borrowerProfileReady
    ? Number(profile.borrower.monthly_life?.household_net_income || profile.borrower.income?.net_monthly || 0)
    : null;
    
  const prudentRentBase = Number(caseData.economics.current_rent_if_occupied || caseData.economics.estimated_market_rent || 0);
  const rentRecognitionPct = Number(lenderPack?.rules?.recognized_future_rent_pct || 80);
  
  const expectedRentIncome = prudentRentBase ? round(prudentRentBase * (rentRecognitionPct / 100), 0) : 0;
  if (strategyMode === 'investment' && householdNet !== null) {
    householdNet += expectedRentIncome;
  }

  const monthlyCharges = borrowerProfileReady
    ? Number(profile.borrower.monthly_life?.fixed_charges || 0)
      + Number(profile.borrower.monthly_life?.insurance || 0)
      + Number(profile.borrower.liabilities?.recurring_commitments || 0)
    : null;

  const debtRatioPct = householdNet && monthlyPayment !== null && monthlyCharges !== null ? ((monthlyPayment + monthlyCharges) / householdNet) * 100 : null;
  const remainingIncome = householdNet && monthlyPayment !== null && monthlyCharges !== null ? householdNet - monthlyPayment - monthlyCharges : null;
  const ltvPct = askingPrice && loanAmount !== null ? (loanAmount / askingPrice) * 100 : null;

  function scenario(overrides) {
    const scenarioPrice = overrides.price ?? askingPrice;
    const scenarioRate = overrides.ratePct ?? ratePct;
    const scenarioWorks = overrides.extraWorks ?? immediateWorks;
    const scenarioLoan = loanAmount === null ? null : Math.max(0, loanAmount + (scenarioPrice - askingPrice));
    const scenarioMonthly = monthlyPaymentIfKnown(scenarioLoan, scenarioRate, durationYears);
    const recognizedRent = overrides.recognizedRent ?? 0;
    const scenarioNet = householdNet === null || monthlyCharges === null || scenarioMonthly === null
      ? null
      : householdNet + recognizedRent - monthlyCharges - scenarioMonthly;
    const scenarioDebtRatio = householdNet && monthlyCharges !== null && scenarioMonthly !== null ? ((scenarioMonthly + monthlyCharges) / householdNet) * 100 : null;
    return {
      price: scenarioPrice,
      rate_pct: scenarioRate,
      loan_amount: scenarioLoan,
      monthly_payment: scenarioMonthly,
      remaining_income: round(scenarioNet, 0),
      debt_ratio_pct: scenarioDebtRatio ? round(scenarioDebtRatio, 1) : null,
      extra_works: scenarioWorks,
    };
  }

  const baseline = scenario({});
  const negotiated = scenario({ price: pricing.target_price || askingPrice });
  const rateStress = scenario({ ratePct: ratePct + 1.0 });
  const worksStress = scenario({ extraWorks: round(immediateWorks * 1.25, 0) });
  const rentScenario = prudentRentBase
    ? scenario({ recognizedRent: prudentRentBase * (rentRecognitionPct / 100) })
    : null;

  const lenderDebtLimit = Number(lenderPack?.rules?.max_debt_ratio_pct || 40);
  const lenderRemainingIncomeFloor = Number(lenderPack?.rules?.prudent_remaining_income_floor_eur || 1200);
  const borrowerRemainingIncomeFloor = borrowerProfileReady ? Number(profile.borrower.monthly_life?.target_remaining_income || 0) : 0;
  const remainingIncomeFloor = Math.max(lenderRemainingIncomeFloor, borrowerRemainingIncomeFloor || 0);
  const withinMonthlyCap = strategyMaxMonthly === null || (baseline.monthly_payment !== null && baseline.monthly_payment <= strategyMaxMonthly);
  const nearDebtLimit = baseline.debt_ratio_pct !== null && baseline.debt_ratio_pct <= lenderDebtLimit + 5;
  const nearIncomeFloor = baseline.remaining_income !== null && baseline.remaining_income >= remainingIncomeFloor - 100;
  const nearMonthlyCap = strategyMaxMonthly === null || (baseline.monthly_payment !== null && baseline.monthly_payment <= strategyMaxMonthly + 100);
  const financeVerdict = borrowerProfileReady && baseline.debt_ratio_pct !== null && baseline.remaining_income !== null
    ? (baseline.debt_ratio_pct <= lenderDebtLimit && baseline.remaining_income >= remainingIncomeFloor && withinMonthlyCap ? 'financeable'
      : nearDebtLimit && nearIncomeFloor && nearMonthlyCap ? 'tight'
        : 'not_financeable')
    : 'unknown';

  return {
    acquisition_costs: {
      purchase_price: askingPrice,
      registration_duties: duty.amount,
      purchase_deed_cost_estimate: purchaseDeedCostEstimate,
      mortgage_deed_cost_estimate: mortgageDeedCostEstimate,
      bank_file_fee_estimate: bankFileFeeEstimate,
      valuation_fee_estimate: valuationFeeEstimate,
      insurance_setup_estimate: insuranceSetupEstimate,
      immediate_works: immediateWorks,
      works_12_months: works12Months,
      contingency_reserve: contingency,
      total_project_cost: totalProjectCost,
      total_cash_out: totalCashOut,
      minimum_cash_to_keep_after_operation: savingsToKeep,
    },
    capital_requirements: {
      mobilizable_cash: mobilizableCash,
      available_securities: securities,
      total_assets_available: totalAssetsAvailable,
      cash_gap: cashGap,
      asset_gap: assetGap,
      requires_liquidation_of_securities: (cashGap !== null && cashGap > 0 && assetGap !== null && assetGap === 0)
    },
    baseline,
    scenarios: {
      baseline,
      negotiated_price: negotiated,
      higher_rate: rateStress,
      higher_works: worksStress,
      partial_rent_recognition: rentScenario,
    },
    financeability: {
      verdict: financeVerdict,
      rate_pct: ratePct,
      duration_years: durationYears,
      quotity_pct: ltvPct ? round(ltvPct, 1) : null,
      debt_ratio_pct: baseline.debt_ratio_pct,
      remaining_income: baseline.remaining_income,
      lender_debt_limit_pct: lenderDebtLimit,
      remaining_income_floor: remainingIncomeFloor,
      borrower_monthly_payment_cap: strategyMaxMonthly,
    },
    profile_status: {
      borrower_profile_ready: borrowerProfileReady,
      status: profileStatus.status || 'unknown',
      warnings: profileStatus.warnings || [],
    },
    summary_lines: [
      { label: 'Total project cost', value: formatCurrency(totalProjectCost) },
      { label: 'Total cash out', value: formatCurrency(totalCashOut) },
      { label: 'Loan amount', value: formatCurrency(loanAmount) },
      { label: 'Monthly payment', value: formatCurrency(monthlyPayment) },
      { label: 'Borrower monthly payment cap', value: formatCurrency(strategyMaxMonthly) },
      { label: 'Debt ratio', value: baseline.debt_ratio_pct === null ? 'unknown' : `${round(baseline.debt_ratio_pct, 1)}%` },
      { label: 'Remaining income', value: formatCurrency(baseline.remaining_income) },
      { label: 'Cash Gap (Missing Cash)', value: cashGap && cashGap > 0 ? formatCurrency(cashGap) : 'None' },
      { label: 'Requires Securities Liquidation', value: (cashGap !== null && cashGap > 0 && assetGap !== null && assetGap === 0) ? 'Yes' : 'No' },
      { label: 'Borrower profile status', value: borrowerProfileReady ? 'configured' : `not ready (${profileStatus.status || 'unknown'})` },
    ],
  };
}
