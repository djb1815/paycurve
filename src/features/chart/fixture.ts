import type { ChartMarker, ChartPoint } from './ProjectionChart';

export const chartFixture: readonly ChartPoint[] = [
  {
    sacrifice: '£0',
    adjustedNetIncome: '£108,000',
    annualNetEmploymentPay: '£76,200',
    disposableCash: '£72,100',
    pensionInput: '£6,000',
    marker: 'Current',
    values: {
      sacrificePence: 0,
      adjustedNetIncomePence: 10_800_000,
      annualNetEmploymentPayPence: 7_620_000,
      annualDisposableCashPence: 7_210_000,
      pensionInputPence: 600_000,
    },
  },
  {
    sacrifice: '£8,500',
    adjustedNetIncome: '£99,500',
    annualNetEmploymentPay: '£71,700',
    disposableCash: '£67,600',
    pensionInput: '£14,500',
    marker: 'Optimal',
    values: {
      sacrificePence: 850_000,
      adjustedNetIncomePence: 9_950_000,
      annualNetEmploymentPayPence: 7_170_000,
      annualDisposableCashPence: 6_760_000,
      pensionInputPence: 1_450_000,
    },
  },
  {
    sacrifice: '£12,000',
    adjustedNetIncome: '£96,000',
    annualNetEmploymentPay: '£69,800',
    disposableCash: '£65,700',
    pensionInput: '£18,000',
    marker: 'Alternative',
    values: {
      sacrificePence: 1_200_000,
      adjustedNetIncomePence: 9_600_000,
      annualNetEmploymentPayPence: 6_980_000,
      annualDisposableCashPence: 6_570_000,
      pensionInputPence: 1_800_000,
    },
  },
];

export const chartMarkersFixture: readonly ChartMarker[] = [
  { id: 'current', label: 'Current' },
  { id: 'optimal', label: 'Optimal' },
  { id: 'alternative', label: 'Alternative' },
  { id: 'target', label: 'ANI target', description: '£100,000' },
  {
    id: 'statutoryThreshold',
    label: 'Statutory threshold',
    description: '£100,000 ANI',
  },
  {
    id: 'personalAllowanceBreakpoint',
    label: 'Personal Allowance breakpoint',
    description: 'Allowance begins to taper above £100,000 ANI',
  },
];
