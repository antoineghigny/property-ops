import { renderTemplate } from '../shared/render.mjs';

export function buildVisitChecklist(caseData, analysis) {
  const firstVisit = [
    'Check humidity, cracks, and visible water ingress.',
    'Check the state of windows, glazing, and ventilation.',
    'Photograph electricity board, boiler, bathrooms, and kitchen.',
    'Verify room dimensions and circulation quality.',
    'Confirm condominium charges and common-area condition if applicable.',
  ];

  const secondVisit = [
    'Bring a measuring tape and verify critical dimensions.',
    'Ask for technical documents, invoices, and recent maintenance proof.',
    'Confirm whether any urbanism or copro issue has been disclosed.',
    'Cross-check PEB/EPC details against the certificate.',
  ];

  const askAgent = [
    'Which documents can be shared before an offer?',
    'Has the property price changed recently?',
    'Are there voted or planned condominium works?',
    'Are there hidden occupancy, lease, or servitude constraints?',
    'Can the full PEB/EPC certificate be shared now?',
  ];

  const documentOnSite = [
    'Take photos of meter setups and technical rooms.',
    'Document façade, roof signs, and basement condition.',
    'Capture any defect that can justify negotiation later.',
  ];

  if (analysis.manual_reviews.length > 0) {
    askAgent.push('Please clarify the unresolved manual review items identified in the analysis.');
  }

  return renderTemplate('visit-checklist.md.hbs', {
    caseId: caseData.case_id,
    firstVisit,
    secondVisit,
    askAgent,
    documentOnSite,
  });
}
