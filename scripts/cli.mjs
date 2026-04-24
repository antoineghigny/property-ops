#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ingestFromUrl } from '../adapters/listings/fetch-listing.mjs';
import { resolveIdentity } from '../engine/identity-resolution/resolve-identity.mjs';
import { saveCase, loadCase, saveAnalysis, saveCaseArtifact, saveCaseJsonArtifact, loadAnalysis, appendDecisionLog, setWorkflowState } from '../engine/shared/store.mjs';
import { nowIso, slugify, splitCsvLike } from '../engine/shared/utils.mjs';
import { enrichCase } from '../engine/enrichment/enrich-case.mjs';
import { renderReport } from '../engine/artifacts/render-report.mjs';
import { renderCollectDocs } from '../engine/artifacts/render-collect-docs.mjs';
import { buildVisitChecklist } from '../engine/artifacts/render-visit.mjs';
import { renderBankPackageHtml, renderBankPackageMarkdown } from '../engine/artifacts/render-bank-package.mjs';
import { renderDeepReport } from '../engine/artifacts/render-deep-report.mjs';
import { compareCases } from '../engine/comparator/compare-cases.mjs';
import { buildTracker } from '../engine/tracker/build-tracker.mjs';
import { loadProfile, loadProfileStatus } from '../engine/shared/config.mjs';
import { writeJson, writeText } from '../engine/shared/fs.mjs';
import { TRACKER_DIR } from '../engine/shared/paths.mjs';
import { execFile } from 'child_process';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        index += 1;
      }
    }
  }
  return args;
}

function saveArtifacts(caseId, analysis, reportMarkdown) {
  saveAnalysis(caseId, analysis);
  saveCaseArtifact(caseId, 'report.md', reportMarkdown);
  saveCaseJsonArtifact(caseId, 'summary.json', {
    case_id: caseId,
    generated_at: analysis.generated_at,
    decisions: analysis.decisions,
    scores: analysis.scores,
  });
}

async function performAnalysis(caseId, args = {}) {
  const profileStatus = loadProfileStatus();
  if (!profileStatus.is_ready && !args.provisional) {
    throw new Error(`Borrower profile is ${profileStatus.status}. Complete config/profile.yml first, or rerun with --provisional for a property-only screen.`);
  }
  const current = loadCase(caseId);
  const shouldResolve = Boolean(
    current.identity?.raw_address
    && (!current.identity.normalized_address || ['unknown', 'low'].includes(current.identity.identity_confidence || 'unknown')),
  );
  const resolved = shouldResolve ? await resolveIdentity(caseId) : current;
  const analysis = await enrichCase(resolved);
  const reportMarkdown = renderReport(resolved, analysis);
  const deepReportMarkdown = renderDeepReport(resolved, analysis, analysis.profile_context);
  saveArtifacts(caseId, analysis, reportMarkdown);
  saveCaseArtifact(caseId, 'deep-report.md', deepReportMarkdown);
  setWorkflowState(caseId, 'scored');
  appendDecisionLog(caseId, args.provisional ? 'analysis_refreshed_provisional' : 'analysis_refreshed', null, analysis.decisions, ['The full analysis pipeline was executed.']);
  return { resolved, analysis, reportMarkdown, profileStatus, identityAttempted: shouldResolve };
}

async function maybeGeneratePdf(caseId) {
  const htmlPath = resolve(`data/cases/${slugify(caseId)}/bank-package.html`);
  const pdfPath = resolve(`data/cases/${slugify(caseId)}/bank-package.pdf`);
  await new Promise((resolvePromise, rejectPromise) => {
    execFile('node', ['scripts/generate-pdf.mjs', htmlPath, pdfPath], { cwd: resolve('.') }, error => {
      if (error) rejectPromise(error);
      else resolvePromise();
    });
  });
  return pdfPath;
}

async function commandIngest(args) {
  let caseData;
  if (args.url) {
    caseData = await ingestFromUrl(args.url, args.case);
  } else if (args['json-file']) {
    caseData = JSON.parse(readFileSync(resolve(args['json-file']), 'utf8'));
    caseData.case_id = args.case || caseData.case_id || slugify(caseData.listing?.title || `case-${Date.now()}`);
    caseData.meta = { ...(caseData.meta || {}), workflow_state: 'ingested' };
    caseData.source = { ...(caseData.source || {}), collected_at: caseData.source?.collected_at || nowIso() };
  } else {
    throw new Error('Provide either --url or --json-file');
  }
  const saved = saveCase(caseData);
  appendDecisionLog(saved.case_id, 'case_ingested', null, saved, ['The case was ingested into canonical storage.']);
  console.log(saved.case_id);
}

async function commandResolveIdentity(args) {
  if (!args.case) throw new Error('Provide --case');
  const resolved = await resolveIdentity(args.case);
  console.log(JSON.stringify(resolved.identity, null, 2));
}

async function commandAnalyze(args) {
  if (!args.case) throw new Error('Provide --case');
  const { reportMarkdown } = await performAnalysis(args.case, args);
  console.log(reportMarkdown);
}

async function commandScreen(args) {
  let caseData;
  if (args.url) {
    caseData = await ingestFromUrl(args.url, args.case);
  } else if (args['json-file']) {
    caseData = JSON.parse(readFileSync(resolve(args['json-file']), 'utf8'));
    caseData.case_id = args.case || caseData.case_id || slugify(caseData.listing?.title || `case-${Date.now()}`);
    caseData.meta = { ...(caseData.meta || {}), workflow_state: 'ingested' };
    caseData.source = { ...(caseData.source || {}), collected_at: caseData.source?.collected_at || nowIso() };
  } else {
    throw new Error('Provide either --url or --json-file');
  }

  const saved = saveCase(caseData);
  appendDecisionLog(saved.case_id, 'case_ingested', null, saved, ['The case was ingested into canonical storage.']);

  const { analysis, profileStatus, identityAttempted } = await performAnalysis(saved.case_id, args);

  const report = renderDeepReport(loadCase(saved.case_id), analysis, analysis.profile_context);
  saveCaseArtifact(saved.case_id, 'deep-report.md', report);
  console.log(report);
  console.log(report);

  const generatedArtifacts = ['case.json', 'analysis.json', 'report.md', 'summary.json', 'deep-report.md'];

  if (analysis.decisions.must_request_docs) {
    const collectDocsMarkdown = renderCollectDocs(loadCase(saved.case_id), analysis);
    saveCaseArtifact(saved.case_id, 'collect-docs.md', collectDocsMarkdown);
    generatedArtifacts.push('collect-docs.md');
  }

  if (analysis.decisions.should_visit) {
    const visitMarkdown = buildVisitChecklist(loadCase(saved.case_id), analysis);
    saveCaseArtifact(saved.case_id, 'visit-checklist.md', visitMarkdown);
    generatedArtifacts.push('visit-checklist.md');
  }

  console.log(JSON.stringify({
    case_id: saved.case_id,
    profile_status: profileStatus.status,
    provisional: !profileStatus.is_ready,
    identity_resolution_attempted: identityAttempted,
    identity_confidence: loadCase(saved.case_id).identity.identity_confidence || 'unknown',
    verdict: analysis.decisions.verdict,
    recommendation_band: analysis.decisions.recommendation_band,
    generated_artifacts: generatedArtifacts.map(name => `data/cases/${slugify(saved.case_id)}/${name}`),
    next_best_action: analysis.decisions.next_best_action,
    next_steps: analysis.next_steps,
  }, null, 2));
}

async function commandScore(args) {
  if (!args.case) throw new Error('Provide --case');
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  console.log(JSON.stringify(analysis.scores, null, 2));
}

async function commandComps(args) {
  if (!args.case) throw new Error('Provide --case');
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  console.log(JSON.stringify(analysis.derived_metrics.pricing, null, 2));
}

async function commandFinance(args) {
  if (!args.case) throw new Error('Provide --case');
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  console.log(JSON.stringify(analysis.derived_metrics.finance, null, 2));
}

async function commandCollectDocs(args) {
  if (!args.case) throw new Error('Provide --case');
  const caseData = loadCase(args.case);
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  const markdown = renderCollectDocs(caseData, analysis);
  saveCaseArtifact(args.case, 'collect-docs.md', markdown);
  setWorkflowState(args.case, 'documents_requested');
  appendDecisionLog(args.case, 'document_checklist_generated', null, { missing: analysis.documents.missing }, ['The document checklist was generated.']);
  console.log(markdown);
}

async function commandVisit(args) {
  if (!args.case) throw new Error('Provide --case');
  const caseData = loadCase(args.case);
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  const markdown = buildVisitChecklist(caseData, analysis);
  saveCaseArtifact(args.case, 'visit-checklist.md', markdown);
  setWorkflowState(args.case, 'visit_planned');
  appendDecisionLog(args.case, 'visit_checklist_generated', null, null, ['The visit checklist was generated.']);
  console.log(markdown);
}

async function commandBankPackage(args) {
  if (!args.case) throw new Error('Provide --case');
  const caseData = loadCase(args.case);
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  const profileStatus = loadProfileStatus();
  if (!profileStatus.is_ready) {
    throw new Error(`Borrower profile is ${profileStatus.status}. Complete config/profile.yml before generating a bank package.`);
  }
  const profile = loadProfile();
  const html = renderBankPackageHtml(caseData, analysis, profile);
  const markdown = renderBankPackageMarkdown(caseData, analysis, profile);
  saveCaseArtifact(args.case, 'bank-package.html', html);
  saveCaseArtifact(args.case, 'bank-package.md', markdown);
  setWorkflowState(args.case, 'under_bank_review');
  appendDecisionLog(args.case, 'bank_package_generated', null, null, ['The bank package was generated.']);
  if (args.pdf) {
    const pdfPath = await maybeGeneratePdf(args.case);
    console.log(pdfPath);
    return;
  }
  console.log(markdown);
}

async function commandCompare(args) {
  const caseIds = splitCsvLike(args.cases);
  if (caseIds.length === 0) throw new Error('Provide --cases a,b,c');
  const comparison = compareCases(caseIds);
  console.log(comparison.markdown);
}

async function commandTracker() {
  const tracker = buildTracker();
  writeText(resolve(TRACKER_DIR, 'tracker.md'), tracker.markdown);
  writeJson(resolve(TRACKER_DIR, 'tracker.json'), tracker.rows);
  console.log(tracker.markdown);
}

async function commandBatch(args) {
  const files = splitCsvLike(args['json-files']);
  if (files.length === 0) throw new Error('Provide --json-files a.json,b.json');
  for (const file of files) {
    const absolute = resolve(file);
    const caseData = JSON.parse(readFileSync(absolute, 'utf8'));
    caseData.case_id = caseData.case_id || slugify(caseData.listing?.title || absolute);
    saveCase(caseData);
    await resolveIdentity(caseData.case_id);
    const analysis = await enrichCase(loadCase(caseData.case_id));
    const reportMarkdown = renderReport(loadCase(caseData.case_id), analysis);
    saveArtifacts(caseData.case_id, analysis, reportMarkdown);
    setWorkflowState(caseData.case_id, 'scored');
    console.log(`Analyzed ${caseData.case_id}`);
  }
}

async function commandNegotiate(args) {
  if (!args.case) throw new Error('Provide --case');
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  console.log(JSON.stringify({
    target_price: analysis.decisions.price_guardrails.target_price,
    rational_max_price: analysis.decisions.price_guardrails.rational_max_price,
    comfortable_max_price: analysis.decisions.price_guardrails.comfortable_max_price,
    aggressive_max_price: analysis.decisions.price_guardrails.aggressive_max_price,
    red_flags: analysis.decisions.red_flags,
  }, null, 2));
}

async function commandRefresh(args) {
  return commandAnalyze(args);
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

async function commandDeep(args) {
  if (!args.case) throw new Error('Provide --case');
  const caseData = loadCase(args.case);
  const analysis = loadAnalysis(args.case);
  if (!analysis) throw new Error('Run analyze first');
  const report = renderDeepReport(caseData, analysis);
  saveCaseArtifact(args.case, 'deep-report.md', report);
  console.log(report);
}

const handlers = {
  screen: commandScreen,
  ingest: commandIngest,
  'resolve-identity': commandResolveIdentity,
  analyze: commandAnalyze,
  score: commandScore,
  comps: commandComps,
  finance: commandFinance,
  'collect-docs': commandCollectDocs,
  visit: commandVisit,
  'bank-package': commandBankPackage,
  compare: commandCompare,
  tracker: commandTracker,
  batch: commandBatch,
  negotiate: commandNegotiate,
  refresh: commandRefresh,
  deep: commandDeep,
};

if (!handlers[command]) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

handlers[command](args).catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
