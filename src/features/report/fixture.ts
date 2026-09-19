import type { ReportSection } from './ReportPanel';

export const reportFixture: readonly ReportSection[] = [
  {
    id: 'assumptions',
    heading: 'Assumptions',
    body: 'England, Wales, and Northern Ireland tax treatment; one PAYE employment; annual planning estimate.',
  },
  {
    id: 'limitations',
    heading: 'Limitations',
    body: 'This planning summary is not tax advice and does not model every pension or payroll rule.',
  },
];
