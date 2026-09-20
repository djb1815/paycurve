import type { PlanningReport, ReportSection } from './ReportPanel';

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

export const planningReportFixture: PlanningReport = {
  taxYearLabel: '2026/27',
  taxConfigVersion: 'uk-ruk-2026-27-v1',
  inputs: [
    {
      id: 'salary',
      label: 'Base salary',
      value: '£112,000.00',
      status: 'actual',
    },
    {
      id: 'bonus',
      label: 'Expected bonus',
      value: '£11,200.00',
      status: 'forecast',
    },
    { id: 'target', label: 'ANI target', value: '£100,000.00' },
  ],
  scenarios: [
    {
      id: 'current',
      label: 'Current',
      adjustedNetIncome: '£108,400.00',
      annualNetEmploymentPay: '£73,002.00',
      annualDisposableCash: '£73,002.00',
      annualPensionInput: '£0.00',
      targetPosition: '£8,400.00 above target',
    },
    {
      id: 'optimal',
      label: 'Optimal',
      adjustedNetIncome: '£100,000.00',
      annualNetEmploymentPay: '£68,884.00',
      annualDisposableCash: '£68,884.00',
      annualPensionInput: '£8,400.00',
      targetPosition: 'At target',
    },
  ],
  insights: [
    {
      id: 'headroom',
      severity: 'information',
      title: 'Forecast amounts affect headroom',
      body: 'Confirm the plan when forecast income becomes actual.',
    },
  ],
  notices: [
    {
      id: 'forecast',
      severity: 'warning',
      title: 'Forecast income is included',
      body: 'Check the target headroom again when bonus or equity values become actual.',
    },
  ],
  assumptions: [
    'Annual estimate for one PAYE employment in England, Wales, or Northern Ireland.',
    'PAYE-aware figures are not a payslip reconciliation.',
  ],
  traces: [
    {
      id: 'ani',
      title: 'Adjusted net income',
      total: '£100,000.00',
      lines: [
        {
          id: 'employment',
          label: 'Taxable employment income',
          value: '£108,400.00',
        },
        {
          id: 'sacrifice',
          label: 'Additional salary sacrifice',
          value: '−£8,400.00',
        },
      ],
    },
  ],
  chartAlternative: {
    caption:
      'Supplied curve points; use this table instead of relying on the chart in print.',
    rows: [
      {
        id: 'current',
        label: 'Current',
        sacrifice: '£0.00',
        adjustedNetIncome: '£108,400.00',
        netEmploymentPay: '£73,002.00',
        disposableCash: '£73,002.00',
      },
      {
        id: 'target',
        label: 'Target point',
        sacrifice: '£8,400.00',
        adjustedNetIncome: '£100,000.00',
        netEmploymentPay: '£68,884.00',
        disposableCash: '£68,884.00',
      },
    ],
  },
};
