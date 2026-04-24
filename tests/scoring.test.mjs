import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreCase } from '../engine/decision-engine/score-case.mjs';

test('scoreCase returns five bounded scores', () => {
  const caseData = {
    identity: { identity_confidence: 'high' },
    economics: { asking_price: 300000 },
    energy: { label: 'C' },
    typology: { property_kind: 'apartment' },
  };
  const analysis = {
    profile_status: { is_finance_ready: true },
    property_facts: { a: { value: 1, manual_review_required: false } },
    market_context: { b: { value: 1, manual_review_required: false } },
    policy_context: { c: { value: 1, manual_review_required: false } },
    lender_assumptions: { d: { value: 1, manual_review_required: false } },
    derived_metrics: {
      pricing: { local_median_price: 310000 },
      finance: { financeability: { debt_ratio_pct: 33, remaining_income: 1500 } },
      works: { immediate_works_estimate: 5000 },
    },
    documents: { missing: ['energy_certificate'] },
    manual_reviews: [],
  };

  const scores = scoreCase(caseData, analysis);
  for (const key of ['deal_score', 'finance_fit_score', 'risk_score', 'data_confidence_score', 'execution_score']) {
    assert.equal(typeof scores[key], 'number');
    assert.ok(scores[key] >= 0 && scores[key] <= 100);
  }
});

test('scoreCase zeros finance fit when borrower profile is not ready', () => {
  const caseData = {
    identity: { identity_confidence: 'high' },
    economics: { asking_price: 300000 },
    energy: { label: 'C' },
    typology: { property_kind: 'apartment' },
  };
  const analysis = {
    profile_status: { is_finance_ready: false },
    property_facts: { a: { value: 1, manual_review_required: false } },
    market_context: { b: { value: 1, manual_review_required: false } },
    policy_context: { c: { value: 1, manual_review_required: false } },
    lender_assumptions: { d: { value: 1, manual_review_required: false } },
    derived_metrics: {
      pricing: { local_median_price: 310000 },
      finance: { financeability: { debt_ratio_pct: null, remaining_income: null } },
      works: { immediate_works_estimate: 5000 },
    },
    documents: { missing: [] },
    manual_reviews: [],
  };

  const scores = scoreCase(caseData, analysis);
  assert.equal(scores.finance_fit_score, 0);
});

test('scoreCase does not give a strong deal score when the market anchor is missing', () => {
  const caseData = {
    identity: { identity_confidence: 'unknown' },
    economics: { asking_price: 249000 },
    energy: { label: 'B' },
    typology: { property_kind: 'house' },
  };
  const analysis = {
    profile_status: { is_finance_ready: true },
    property_facts: { a: { value: 1, manual_review_required: false } },
    market_context: {},
    policy_context: { c: { value: 1, manual_review_required: false } },
    lender_assumptions: { d: { value: 1, manual_review_required: false } },
    derived_metrics: {
      pricing: { local_median_price: null },
      finance: { financeability: { debt_ratio_pct: 52.9, remaining_income: 1201 } },
      works: { immediate_works_estimate: 5000 },
    },
    documents: { missing: ['recent_payslips'] },
    manual_reviews: ['Address normalization is incomplete.'],
  };

  const scores = scoreCase(caseData, analysis);
  assert.ok(scores.deal_score < 60);
});
