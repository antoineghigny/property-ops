import { resolve } from 'path';
import { CASES_DIR } from './paths.mjs';
import { ensureDir, nowIso, slugify } from './utils.mjs';
import { listDirectories, readJson, writeJson, writeText } from './fs.mjs';
import { PropertyCaseSchema } from './schemas.mjs';

export function caseDir(caseId) {
  return resolve(CASES_DIR, slugify(caseId));
}

export function caseFile(caseId, fileName) {
  return resolve(caseDir(caseId), fileName);
}

export function saveCase(caseData) {
  const parsed = PropertyCaseSchema.parse(caseData);
  ensureDir(caseDir(parsed.case_id));
  writeJson(caseFile(parsed.case_id, 'case.json'), parsed);
  return parsed;
}

export function loadCase(caseId) {
  const data = readJson(caseFile(caseId, 'case.json'));
  if (!data) throw new Error(`Case not found: ${caseId}`);
  return PropertyCaseSchema.parse(data);
}

export function saveAnalysis(caseId, analysis) {
  writeJson(caseFile(caseId, 'analysis.json'), analysis);
}

export function loadAnalysis(caseId) {
  return readJson(caseFile(caseId, 'analysis.json'));
}

export function saveCaseArtifact(caseId, fileName, content) {
  writeText(caseFile(caseId, fileName), content);
}

export function saveCaseJsonArtifact(caseId, fileName, content) {
  writeJson(caseFile(caseId, fileName), content);
}

export function listCaseIds() {
  return listDirectories(CASES_DIR);
}

export function appendDecisionLog(caseId, eventType, before = null, after = null, why = []) {
  const logPath = caseFile(caseId, 'decision-log.jsonl');
  const entry = {
    event_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    case_id: caseId,
    happened_at: nowIso(),
    actor: 'system',
    event_type: eventType,
    before,
    after,
    why,
  };
  const previous = readJson(caseFile(caseId, 'decision-log.json'), []);
  previous.push(entry);
  writeJson(caseFile(caseId, 'decision-log.json'), previous);
}

export function setWorkflowState(caseId, state) {
  const current = loadCase(caseId);
  current.meta = current.meta || {};
  current.meta.workflow_state = state;
  saveCase(current);
}
