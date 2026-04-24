import yaml from 'js-yaml';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { BorrowerProfileSchema, LendersSchema, StrategySchema } from './schemas.mjs';
import { CONFIG_DIR } from './paths.mjs';
import { normalizeText } from './utils.mjs';

function loadYamlFileWithMeta(actualName, exampleName = null) {
  const actualPath = resolve(CONFIG_DIR, actualName);
  const examplePath = exampleName ? resolve(CONFIG_DIR, exampleName) : null;
  const usingPrimary = existsSync(actualPath);
  const path = usingPrimary ? actualPath : examplePath;
  if (!path || !existsSync(path)) {
    throw new Error(`Missing config file: ${actualName}`);
  }
  return {
    data: yaml.load(readFileSync(path, 'utf8')),
    path,
    using_example_fallback: !usingPrimary,
  };
}

function loadYamlFile(actualName, exampleName = null) {
  return loadYamlFileWithMeta(actualName, exampleName).data;
}

function getNestedValue(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function hasConfiguredValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  return true;
}

const REQUIRED_PROFILE_FIELDS = [
  'borrower.identity.first_name',
  'borrower.identity.last_name',
  'borrower.identity.current_address',
  'borrower.employment.contract_type',
  'borrower.income.net_monthly',
  'borrower.assets.own_funds_mobilizable',
  'borrower.monthly_life.household_net_income',
  'borrower.monthly_life.target_remaining_income',
];

const FINANCE_PROFILE_FIELDS = [
  'borrower.income.net_monthly',
  'borrower.assets.own_funds_mobilizable',
  'borrower.monthly_life.household_net_income',
  'borrower.monthly_life.target_remaining_income',
];

const QUESTION_GROUPS = [
  {
    id: 'identity_household',
    title: 'Identity and household',
    fields: [
      'borrower.identity.first_name',
      'borrower.identity.last_name',
      'borrower.identity.date_of_birth',
      'borrower.identity.current_address',
      'borrower.identity.civil_status',
      'borrower.identity.household_dependents',
      'borrower.identity.household_composition',
      'borrower.identity.has_co_borrower',
    ],
    questions: [
      'What is your full legal name?',
      'What is your date of birth?',
      'What is your current address?',
      'What is your civil status and household composition?',
      'Are you buying alone or with a co-borrower?',
      'How many dependents do you have?',
    ],
  },
  {
    id: 'employment_income',
    title: 'Employment and income',
    fields: [
      'borrower.employment.employer',
      'borrower.employment.contract_type',
      'borrower.employment.start_date',
      'borrower.employment.function_title',
      'borrower.income.net_monthly',
      'borrower.income.gross_monthly',
      'borrower.income.variable_income',
      'borrower.income.bonus',
      'borrower.income.existing_rental_income',
      'borrower.income.other_recurring_income',
    ],
    questions: [
      'Who is your employer and what is your contract type?',
      'When did you start in your current role?',
      'What is your current function or job title?',
      'What is your monthly net income and gross income?',
      'Do you have any bonus, variable income, rental income, or other recurring income?',
    ],
  },
  {
    id: 'assets_liabilities',
    title: 'Assets and liabilities',
    fields: [
      'borrower.assets.available_cash',
      'borrower.assets.own_funds_mobilizable',
      'borrower.assets.own_funds_to_keep_untouched',
      'borrower.assets.visible_bankable_assets',
      'borrower.liabilities.consumer_loans',
      'borrower.liabilities.car_loans',
      'borrower.liabilities.student_loans',
      'borrower.liabilities.family_loans',
      'borrower.liabilities.recurring_commitments',
      'borrower.liabilities.existing_mortgages',
    ],
    questions: [
      'How much cash or savings do you currently have available?',
      'How much own funds can you mobilize for this purchase?',
      'How much cash do you want to keep untouched after the purchase?',
      'Do you have any existing loans, mortgages, or recurring debt commitments?',
      'Do you have any other bank-visible assets that matter for underwriting?',
    ],
  },
  {
    id: 'monthly_constraints',
    title: 'Monthly life constraints',
    fields: [
      'borrower.monthly_life.household_net_income',
      'borrower.monthly_life.current_rent',
      'borrower.monthly_life.fixed_charges',
      'borrower.monthly_life.insurance',
      'borrower.monthly_life.food',
      'borrower.monthly_life.mobility',
      'borrower.monthly_life.children_costs',
      'borrower.monthly_life.target_remaining_income',
      'borrower.monthly_life.observed_monthly_savings_capacity',
    ],
    questions: [
      'What is your current monthly household net income?',
      'What rent do you currently pay?',
      'What are your recurring monthly fixed charges and insurance costs?',
      'What monthly amount do you want to keep as remaining income after housing costs?',
      'What is your observed monthly savings capacity?',
    ],
  },
];

function detectPlaceholderHits(profile) {
  const firstName = normalizeText(profile.borrower.identity?.first_name);
  const lastName = normalizeText(profile.borrower.identity?.last_name);
  const email = normalizeText(profile.borrower.contact?.email);
  const employer = normalizeText(profile.borrower.employment?.employer);
  const phone = normalizeText(profile.borrower.contact?.phone);
  const address = normalizeText(profile.borrower.identity?.current_address);
  const hits = [];

  if (firstName === 'jane' && lastName === 'doe') hits.push('borrower.identity');
  if (email === 'jane@example.com') hits.push('borrower.contact.email');
  if (employer === 'acme sa') hits.push('borrower.employment.employer');
  if (phone === '+32-000-000-000') hits.push('borrower.contact.phone');
  if (address === '1000 brussels, belgium') hits.push('borrower.identity.current_address');

  return hits;
}

export function assessProfileStatus(profile, meta = {}) {
  const missingRequiredFields = REQUIRED_PROFILE_FIELDS.filter(path => !hasConfiguredValue(getNestedValue(profile, path)));
  const missingFinanceFields = FINANCE_PROFILE_FIELDS.filter(path => !hasConfiguredValue(getNestedValue(profile, path)));
  const placeholderHits = detectPlaceholderHits(profile);
  const completenessPct = Math.round(((REQUIRED_PROFILE_FIELDS.length - missingRequiredFields.length) / REQUIRED_PROFILE_FIELDS.length) * 100);
  const isPlaceholder = meta.using_example_fallback || placeholderHits.length > 0;
  const isReady = !isPlaceholder && missingRequiredFields.length === 0;
  const isFinanceReady = !isPlaceholder && missingFinanceFields.length === 0;

  let status = 'ready';
  if (meta.using_example_fallback) status = 'missing';
  else if (isPlaceholder) status = 'placeholder';
  else if (!isReady) status = 'incomplete';

  const warnings = [];
  if (meta.using_example_fallback) warnings.push('profile.yml is missing; the example profile is being used as a fallback.');
  if (placeholderHits.length > 0) warnings.push('Placeholder borrower values are still present in config/profile.yml.');
  if (missingRequiredFields.length > 0) warnings.push(`${missingRequiredFields.length} required profile field(s) are still missing.`);

  const questionGroups = QUESTION_GROUPS.filter(group => {
    if (isPlaceholder || meta.using_example_fallback) return true;
    return group.fields.some(field => missingRequiredFields.includes(field) || missingFinanceFields.includes(field));
  }).map(group => ({
    id: group.id,
    title: group.title,
    questions: group.questions,
    fields: group.fields.filter(field => missingRequiredFields.includes(field) || missingFinanceFields.includes(field) || isPlaceholder || meta.using_example_fallback),
  }));

  return {
    status,
    source_path: meta.path || null,
    using_example_fallback: Boolean(meta.using_example_fallback),
    placeholder_hits: placeholderHits,
    missing_required_fields: missingRequiredFields,
    missing_finance_fields: missingFinanceFields,
    completeness_pct: completenessPct,
    is_placeholder: isPlaceholder,
    is_ready: isReady,
    is_finance_ready: isFinanceReady,
    warnings,
    question_groups: questionGroups,
  };
}

export function loadProfile() {
  return loadProfileWithStatus().profile;
}

export function loadProfileStatus() {
  return loadProfileWithStatus().status;
}

export function loadProfileWithStatus() {
  const source = loadYamlFileWithMeta('profile.yml', 'profile.example.yml');
  const profile = BorrowerProfileSchema.parse(source.data);
  const status = assessProfileStatus(profile, source);
  return { profile, status };
}

export function loadStrategy() {
  return StrategySchema.parse(loadYamlFile('strategy.yml', 'strategy.example.yml'));
}

export function loadLenders() {
  return LendersSchema.parse(loadYamlFile('lenders.yml', 'lenders.example.yml'));
}
