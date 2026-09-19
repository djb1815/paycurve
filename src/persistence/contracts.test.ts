import { describe, expect, it } from 'vitest';

import type { PlannerState } from '../domain';
import { CURRENT_SCHEMA_VERSION, type SavedPlanV1 } from './contracts';

const planFixture = {
  taxYear: '2026/27',
  targetAni: 9_950_000,
  maxAdditionalRegularSalarySacrifice: 850_000,
  facts: {
    baseSalary: 12_000_000,
    bonus: { guidePercentage: 1_000 },
    equityIncome: [],
    taxableBenefits: { amount: 120_000, certainty: 'actual' },
    savingsInterest: { amount: 50_000, certainty: 'forecast' },
    otherTaxableIncome: 0,
    employerPensionContribution: 600_000,
  },
  current: {
    regularSalarySacrifice: 600_000,
    bonusSalarySacrifice: 0,
    sippNetContribution: 0,
    giftAidCashDonation: 0,
  },
  alternative: {
    regularSalarySacrifice: 1_450_000,
    bonusSalarySacrifice: 0,
    sippNetContribution: 0,
    giftAidCashDonation: 0,
  },
} as const satisfies PlannerState;

describe('SavedPlanV1 contract', () => {
  it('contains reproducibility metadata and planner inputs only', () => {
    const savedPlan = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: '2026-09-19T12:00:00.000Z',
      taxYear: planFixture.taxYear,
      taxConfigVersion: '2026-27.1',
      plan: planFixture,
    } satisfies SavedPlanV1;

    expect(savedPlan.schemaVersion).toBe(1);
    expect(savedPlan.taxYear).toBe('2026/27');
    expect(savedPlan.plan.current).toEqual(planFixture.current);
    expect(savedPlan).not.toHaveProperty('projection');
    expect(savedPlan.plan).not.toHaveProperty('optimal');
  });
});
