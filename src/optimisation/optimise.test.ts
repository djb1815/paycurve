import { describe, expect, it } from 'vitest';

import type {
  CurveRequest,
  OptimisationRequest,
  PlanFacts,
  ScenarioAllocation,
} from '../domain';
import { project } from '../projection';
import { resolveTaxYear } from '../tax';
import { optimiseToTarget, sampleSacrificeCurve } from './index';

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

const request = (
  overrides: Partial<OptimisationRequest> = {},
): OptimisationRequest => ({
  config,
  facts: facts(),
  current: allocation(),
  targetAni: 10_000_000,
  maxAdditionalRegularSalarySacrifice: 1_000_000,
  ...overrides,
});

describe('optimiseToTarget', () => {
  it('returns alreadyAtOrBelow without changing the current allocation', () => {
    const result = optimiseToTarget(request());

    expect(result.kind).toBe('alreadyAtOrBelow');
    if (result.kind === 'alreadyAtOrBelow') {
      expect(result.allocation).toEqual(allocation());
      expect(result.projection.totals.adjustedNetIncome).toBe(10_000_000);
    }
  });

  it('finds the exact first penny that reaches the target', () => {
    const result = optimiseToTarget(
      request({ facts: facts({ baseSalary: 10_000_001 }) }),
    );

    expect(result).toMatchObject({
      kind: 'reached',
      additionalRegularSalarySacrifice: 1,
    });
    if (result.kind === 'reached') {
      expect(result.projection.totals.adjustedNetIncome).toBe(10_000_000);
    }
  });

  it('returns a penny-minimal reached allocation', () => {
    const baseRequest = request({ facts: facts({ baseSalary: 10_050_001 }) });
    const result = optimiseToTarget(baseRequest);

    expect(result).toMatchObject({
      kind: 'reached',
      additionalRegularSalarySacrifice: 50_001,
    });
    if (result.kind === 'reached') {
      const onePennyLess = project({
        config,
        facts: baseRequest.facts,
        allocation: allocation({ regularSalarySacrifice: 50_000 }),
        targetAni: baseRequest.targetAni,
      });
      expect(onePennyLess.totals.adjustedNetIncome).toBe(10_000_001);
      expect(result.projection.totals.adjustedNetIncome).toBeLessThanOrEqual(
        baseRequest.targetAni,
      );
    }
  });

  it('stops at a zero additional-sacrifice cap', () => {
    const result = optimiseToTarget(
      request({
        facts: facts({ baseSalary: 10_000_001 }),
        maxAdditionalRegularSalarySacrifice: 0,
      }),
    );

    expect(result).toMatchObject({
      kind: 'unreachable',
      maximumAllocation: allocation(),
      shortfall: 1,
    });
  });

  it('returns unreachable with structured errors for invalid input', () => {
    const result = optimiseToTarget(
      request({ maxAdditionalRegularSalarySacrifice: -1 }),
    );

    expect(result.kind).toBe('unreachable');
    if (result.kind === 'unreachable') {
      expect(result.maximumAllocation.regularSalarySacrifice).toBe(0);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'negativeAmount',
          path: 'maxAdditionalRegularSalarySacrifice',
          severity: 'error',
        }),
      );
    }
  });

  it('does not search beyond the remaining salary when the user cap is invalid', () => {
    const result = optimiseToTarget(
      request({
        facts: facts({ baseSalary: 100 }),
        current: allocation({ regularSalarySacrifice: 99 }),
        targetAni: 1,
        maxAdditionalRegularSalarySacrifice: 2,
      }),
    );

    expect(result.kind).toBe('unreachable');
    if (result.kind === 'unreachable') {
      expect(result.maximumAllocation.regularSalarySacrifice).toBe(100);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'additionalSacrificeExceedsCap',
          severity: 'error',
        }),
      );
    }
  });

  it('remains logarithmic enough for a large permitted range', () => {
    const startedAt = performance.now();
    const result = optimiseToTarget(
      request({
        facts: facts({ baseSalary: 900_000_000 }),
        targetAni: 100_000_000,
        maxAdditionalRegularSalarySacrifice: 800_000_000,
      }),
    );

    expect(result.kind).toBe('reached');
    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });
});

describe('sampleSacrificeCurve', () => {
  const curveRequest = (
    overrides: Partial<CurveRequest> = {},
  ): CurveRequest => ({
    ...request({
      facts: facts({ baseSalary: 10_500_000 }),
      maxAdditionalRegularSalarySacrifice: 1_000_000,
    }),
    alternative: allocation({ regularSalarySacrifice: 250_000 }),
    maxPoints: 8,
    ...overrides,
  });

  it('includes current, maximum, optimal, alternative, and threshold markers', () => {
    const points = sampleSacrificeCurve(curveRequest());
    const amounts = points.map(
      (point) => point.additionalRegularSalarySacrifice,
    );

    expect(amounts).toEqual(
      expect.arrayContaining([0, 250_000, 500_000, 1_000_000]),
    );
    expect(points).toHaveLength(new Set(amounts).size);
    expect(amounts).toEqual([...amounts].sort((left, right) => left - right));
    expect(
      points.every((point) =>
        point.projection.issues.every((issue) => issue.severity !== 'error'),
      ),
    ).toBe(true);
  });

  it('deduplicates coincident markers and remains deterministic', () => {
    const coincident = curveRequest({
      alternative: allocation({ regularSalarySacrifice: 500_000 }),
      maxPoints: 4,
    });

    const first = sampleSacrificeCurve(coincident);
    const second = sampleSacrificeCurve(coincident);
    expect(first).toEqual(second);
    expect(
      first.map((point) => point.additionalRegularSalarySacrifice),
    ).toEqual([0, 333_333, 500_000, 1_000_000]);
  });

  it('honours the requested point limit and rejects invalid requests', () => {
    expect(sampleSacrificeCurve(curveRequest({ maxPoints: 2 }))).toHaveLength(
      2,
    );
    expect(sampleSacrificeCurve(curveRequest({ maxPoints: 0 }))).toEqual([]);
    expect(
      sampleSacrificeCurve(
        curveRequest({ maxAdditionalRegularSalarySacrifice: -1 }),
      ),
    ).toEqual([]);
  });
});
