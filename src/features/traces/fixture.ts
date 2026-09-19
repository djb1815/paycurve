import type { CalculationTrace } from './CalculationTraces';

export const tracesFixture: readonly CalculationTrace[] = [
  {
    id: 'ani-trace',
    title: 'Adjusted net income',
    summary: 'How £99,500 was derived',
    lines: [
      {
        id: 'employment',
        label: 'Employment and other income',
        formattedAmount: '£132,000',
        operation: 'add',
      },
      {
        id: 'sacrifice',
        label: 'Salary and bonus sacrifice',
        formattedAmount: '−£27,500',
        operation: 'subtract',
      },
      {
        id: 'adjustments',
        label: 'Gross SIPP and Gift Aid',
        formattedAmount: '−£5,000',
        operation: 'subtract',
      },
      {
        id: 'ani',
        label: 'Adjusted net income',
        formattedAmount: '£99,500',
        operation: 'result',
      },
    ],
  },
];
