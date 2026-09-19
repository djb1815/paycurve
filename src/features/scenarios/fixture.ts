import type { ScenarioCardData } from './ScenarioComparison';

export const scenariosFixture: readonly ScenarioCardData[] = [
  {
    id: 'current',
    name: 'Current',
    description: 'Your currently intended allocation.',
    adjustedNetIncome: '£108,000',
    annualDisposableCash: '£72,100',
    annualPensionInput: '£6,000',
    targetHeadroom: '£8,500 over',
  },
  {
    id: 'optimal',
    name: 'Optimal',
    description: 'Minimum sacrifice needed to reach the target.',
    adjustedNetIncome: '£99,500',
    annualDisposableCash: '£67,600',
    annualPensionInput: '£14,500',
    targetHeadroom: '£0',
  },
  {
    id: 'alternative',
    name: 'Alternative',
    description: 'A sandbox for another allocation.',
    adjustedNetIncome: '£96,000',
    annualDisposableCash: '£65,700',
    annualPensionInput: '£18,000',
    targetHeadroom: '£3,500 under',
  },
];
