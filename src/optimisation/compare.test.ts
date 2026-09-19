import { describe, expect, it } from 'vitest';

import type { ProjectedScenario, ScenarioAllocation } from '../domain';
import { project } from '../projection';
import { resolveTaxYear } from '../tax';
import { compareScenarios, optimiseToTarget } from './index';

const config = resolveTaxYear('2026/27');
const facts = {
  baseSalary: 10_100_000,
  bonus: { guidePercentage: 0 },
  equityIncome: [],
  taxableBenefits: { amount: 0, certainty: 'actual' as const },
  savingsInterest: { amount: 0, certainty: 'actual' as const },
  otherTaxableIncome: 0,
  employerPensionContribution: 0,
};
const currentAllocation: ScenarioAllocation = {
  regularSalarySacrifice: 0,
  bonusSalarySacrifice: 0,
  sippNetContribution: 0,
  giftAidCashDonation: 0,
};

describe('compareScenarios', () => {
  it('returns signed deltas against Current for reached and alternative scenarios', () => {
    const current: ProjectedScenario = {
      id: 'current',
      allocation: currentAllocation,
      projection: project({
        config,
        facts,
        allocation: currentAllocation,
        targetAni: 10_000_000,
      }),
    };
    const optimal = optimiseToTarget({
      config,
      facts,
      current: currentAllocation,
      targetAni: 10_000_000,
      maxAdditionalRegularSalarySacrifice: 200_000,
    });
    const alternativeAllocation = {
      ...currentAllocation,
      regularSalarySacrifice: 50_000,
    };
    const alternative: ProjectedScenario = {
      id: 'alternative',
      allocation: alternativeAllocation,
      projection: project({
        config,
        facts,
        allocation: alternativeAllocation,
        targetAni: 10_000_000,
      }),
    };

    const comparison = compareScenarios({ current, optimal, alternative });

    expect(comparison.optimalVersusCurrent).toMatchObject({
      adjustedNetIncome: -100_000,
      totalPensionInput: 100_000,
    });
    expect(comparison.alternativeVersusCurrent).toMatchObject({
      adjustedNetIncome: -50_000,
      totalPensionInput: 50_000,
    });
    expect(
      comparison.alternativeVersusCurrent.annualDisposableCash,
    ).toBeLessThan(0);
  });

  it('does not manufacture an optimal delta for an unreachable target', () => {
    const current: ProjectedScenario = {
      id: 'current',
      allocation: currentAllocation,
      projection: project({
        config,
        facts,
        allocation: currentAllocation,
        targetAni: 10_000_000,
      }),
    };
    const optimal = optimiseToTarget({
      config,
      facts,
      current: currentAllocation,
      targetAni: 10_000_000,
      maxAdditionalRegularSalarySacrifice: 1,
    });

    const comparison = compareScenarios({
      current,
      optimal,
      alternative: current,
    });

    expect(comparison.optimal.kind).toBe('unreachable');
    expect(comparison.optimalVersusCurrent).toBeUndefined();
  });
});
