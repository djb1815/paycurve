import type { SummaryMetric } from './SummaryPanel';

export const summaryFixture: readonly SummaryMetric[] = [
  {
    id: 'ani',
    label: 'Adjusted net income',
    formattedValue: '£99,500',
    detail: 'Selected scenario',
  },
  { id: 'cash', label: 'Annual disposable cash', formattedValue: '£68,400' },
  {
    id: 'headroom',
    label: 'Headroom to target',
    formattedValue: '£500',
    emphasis: 'positive',
  },
];
