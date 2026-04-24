import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinance } from '../engine/finance/calculate-finance.mjs';

function baseProfile() {
  return {
    status: { is_finance_ready: true, status: 'ready', warnings: [] },
    borrower: {
      assets: {
        own_funds_mobilizable: 30000,
        own_funds_to_keep_untouched: 2200,
      },
      income: {
        net_monthly: 2550,
      },
      monthly_life: {
        household_net_income: 2550,
        target_remaining_income: 1000,
        fixed_charges: 0,
        insurance: 0,
      },
      liabilities: {
        recurring_commitments: 0,
      },
    },
  };
}

function baseStrategy() {
  return {
    strategy: {
      mode: 'home',
      duration_preference_years: [20],
      max_bank_monthly_payment: 1750,
    },
  };
}

function baseCase(region = null) {
  return {
    identity: {
      region,
    },
    economics: {
      asking_price: 249000,
      current_rent_if_occupied: 0,
    },
  };
}

function works() {
  return {
    immediate_works_estimate: 5000,
    works_12_months_estimate: 5000,
  };
}

function pricing() {
  return {
    target_price: 230000,
  };
}

test('calculateFinance keeps totals unknown when registration duties are unknown', () => {
  const finance = calculateFinance(
    baseCase(),
    baseProfile(),
    baseStrategy(),
    [],
    { rules: { max_debt_ratio_pct: 40, prudent_remaining_income_floor_eur: 1200, recognized_future_rent_pct: 0 } },
    pricing(),
    works(),
  );

  assert.equal(finance.acquisition_costs.registration_duties, null);
  assert.equal(finance.acquisition_costs.total_project_cost, null);
  assert.equal(finance.baseline.loan_amount, null);
  assert.equal(finance.financeability.verdict, 'unknown');
});

test('calculateFinance applies Wallonia reduced duties when the region is resolved', () => {
  const finance = calculateFinance(
    baseCase('WAL'),
    baseProfile(),
    baseStrategy(),
    [{
      kind: 'registration_duties',
      rules: {
        default_rate_pct: 12.5,
        owner_occupied_unique_home_rate_pct: 3.0,
      },
    }],
    { rules: { max_debt_ratio_pct: 40, prudent_remaining_income_floor_eur: 1200, recognized_future_rent_pct: 0 } },
    pricing(),
    works(),
  );

  assert.equal(finance.acquisition_costs.registration_duties, 7470);
  assert.ok(finance.acquisition_costs.total_project_cost > 0);
  assert.ok(finance.baseline.loan_amount > 0);
});

test('calculateFinance keeps clearly over-limit debt ratios as not_financeable', () => {
  const finance = calculateFinance(
    baseCase('WAL'),
    baseProfile(),
    baseStrategy(),
    [{
      kind: 'registration_duties',
      rules: {
        default_rate_pct: 12.5,
        owner_occupied_unique_home_rate_pct: 3.0,
      },
    }],
    { rules: { max_debt_ratio_pct: 40, prudent_remaining_income_floor_eur: 1200, recognized_future_rent_pct: 0 } },
    pricing(),
    {
      immediate_works_estimate: 20813,
      works_12_months_estimate: 20813,
    },
  );

  assert.equal(finance.financeability.verdict, 'not_financeable');
  assert.ok(finance.financeability.debt_ratio_pct > 45);
});
