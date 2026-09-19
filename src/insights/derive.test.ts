import { describe, expect, it } from 'vitest';

import type {
  PlanFacts,
  ProjectedScenario,
  ScenarioAllocation,
} from '../domain';
import { compareScenarios, optimiseToTarget } from '../optimisation';
import { project } from '../projection';
import { resolveTaxYear } from '../tax';
import { deriveInsights } from './index';

const config = resolveTaxYear('2026/27');

const allocation = (
  overrides: Partial<ScenarioAllocation> = {},
): ScenarioAllocation => ({
  regularSalarySacrifice: 0,
  bonusSalarySacrifice: 0,
  sippNetContribution: 0,
  giftAidCashDonation: 0,
  ...overrides,
});

const facts = (overrides: Partial<PlanFacts> = {}): PlanFacts => ({
  baseSalary: 10_000_000,
  bonus: { guidePercentage: 0 },
  equityIncome: [],
  taxableBenefits: { amount: 0, certainty: 'actual' },
  savingsInterest: { amount: 0, certainty: 'actual' },
  otherTaxableIncome: 0,
  employerPensionContribution: 0,
  ...overrides,
});

function comparisonFor(
  modelFacts: PlanFacts,
  targetAni: number,
  maxAdditionalRegularSalarySacrifice: number,
) {
  const currentAllocation = allocation();
  const current: ProjectedScenario = {
    id: 'current',
    allocation: currentAllocation,
    projection: project({
      config,
      facts: modelFacts,
      allocation: currentAllocation,
      targetAni,
    }),
  };
  const optimal = optimiseToTarget({
    config,
    facts: modelFacts,
    current: currentAllocation,
    targetAni,
    maxAdditionalRegularSalarySacrifice,
  });
  const alternativeAllocation = allocation({
    regularSalarySacrifice: Math.min(1, maxAdditionalRegularSalarySacrifice),
  });
  const alternative: ProjectedScenario = {
    id: 'alternative',
    allocation: alternativeAllocation,
    projection: project({
      config,
      facts: modelFacts,
      allocation: alternativeAllocation,
      targetAni,
    }),
  };

  return compareScenarios({ current, optimal, alternative });
}

function codes(
  insights: readonly { readonly code: string }[],
): readonly string[] {
  return insights.map((insight) => insight.code);
}

describe('deriveInsights', () => {
  it('derives the core structured facts for a forecast near the target', () => {
    const comparison = comparisonFor(
      facts({
        baseSalary: 10_200_000,
        bonus: {
          guidePercentage: 0,
          amountOverride: { amount: 400_000, certainty: 'forecast' },
        },
        employerPensionContribution: 5_550_000,
      }),
      10_000_000,
      700_000,
    );
    const insights = deriveInsights({
      comparison,
      nearThresholdMargin: 1_000_000,
    });

    expect(codes(insights)).toEqual(
      expect.arrayContaining([
        'aniAboveTarget',
        'additionalSacrificeRequired',
        'fullBonusSacrificeInsufficient',
        'forecastHeadroom',
        'personalAllowanceRestored',
        'effectiveContributionCost',
        'averagePeriodCashChange',
        'nearStatutoryThreshold',
        'pensionAllowanceHeadroom',
      ]),
    );
    expect(insights).toContainEqual(
      expect.objectContaining({
        code: 'additionalSacrificeRequired',
        parameters: { amount: 600_000 },
      }),
    );
    expect(
      insights.every((insight) =>
        Object.values(insight.parameters).every(Number.isFinite),
      ),
    ).toBe(true);
  });

  it('reports when the unsacrificed bonus can cover the target excess', () => {
    const comparison = comparisonFor(
      facts({
        baseSalary: 10_000_000,
        bonus: {
          guidePercentage: 0,
          amountOverride: { amount: 200_000, certainty: 'actual' },
        },
      }),
      10_000_000,
      300_000,
    );

    expect(
      codes(deriveInsights({ comparison, nearThresholdMargin: 0 })),
    ).toContain('fullBonusSacrificeSufficient');
  });

  it('reports target headroom rather than target excess when Current is below target', () => {
    const comparison = comparisonFor(
      facts({ baseSalary: 9_900_000 }),
      10_000_000,
      0,
    );

    const insights = deriveInsights({
      comparison,
      nearThresholdMargin: 50_000,
    });
    expect(insights).toContainEqual(
      expect.objectContaining({
        code: 'aniBelowTarget',
        parameters: { headroom: 100_000, targetAni: 10_000_000 },
      }),
    );
    expect(codes(insights)).not.toContain('additionalSacrificeRequired');
  });
});
