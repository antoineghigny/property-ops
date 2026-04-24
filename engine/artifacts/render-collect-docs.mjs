import { renderTemplate } from '../shared/render.mjs';

export function renderCollectDocs(caseData, analysis) {
  return renderTemplate('collect-docs.md.hbs', {
    caseId: caseData.case_id,
    requiredByLaw: analysis.documents.required_by_law,
    requiredByLender: analysis.documents.required_by_lender,
    recommended: analysis.documents.recommended,
    missing: analysis.documents.missing,
  });
}
