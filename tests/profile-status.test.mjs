import test from 'node:test';
import assert from 'node:assert/strict';
import { assessProfileStatus } from '../engine/shared/config.mjs';

test('assessProfileStatus detects placeholder profiles', () => {
  const status = assessProfileStatus({
    borrower: {
      identity: {
        first_name: 'Jane',
        last_name: 'Doe',
        current_address: '1000 Brussels, Belgium',
      },
      contact: {
        email: 'jane@example.com',
        phone: '+32-000-000-000',
      },
      employment: {
        employer: 'Acme SA',
        contract_type: 'permanent_employee',
      },
      income: {
        net_monthly: 3700,
      },
      assets: {
        own_funds_mobilizable: 70000,
      },
      monthly_life: {
        household_net_income: 3700,
        target_remaining_income: 1200,
      },
    },
  });

  assert.equal(status.status, 'placeholder');
  assert.equal(status.is_ready, false);
  assert.equal(status.is_finance_ready, false);
});
