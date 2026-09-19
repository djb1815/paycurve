import type { ChartPoint } from './ProjectionChart';

export const chartFixture: readonly ChartPoint[] = [
  {
    sacrifice: '£0',
    adjustedNetIncome: '£108,000',
    disposableCash: '£72,100',
    pensionInput: '£6,000',
    marker: 'Current',
  },
  {
    sacrifice: '£8,500',
    adjustedNetIncome: '£99,500',
    disposableCash: '£67,600',
    pensionInput: '£14,500',
    marker: 'Optimal',
  },
  {
    sacrifice: '£12,000',
    adjustedNetIncome: '£96,000',
    disposableCash: '£65,700',
    pensionInput: '£18,000',
    marker: 'Alternative',
  },
];
