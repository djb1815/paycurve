import { describe, expect, it } from 'vitest';

import type { PlanFacts, PlannerState, ScenarioAllocation } from '../domain';
import { resolveTaxYear } from '../tax';
import { project, validatePlan } from './index';

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

const plan = (overrides: Partial<PlannerState> = {}): PlannerState => ({
  taxYear: '2026/27',
  targetAni: 10_000_000,
  maxAdditionalRegularSalarySacrifice: 0,
  facts: facts(),
  current: allocation(),
  alternative: allocation(),
  ...overrides,
});

describe('validatePlan', () => {
  it('keeps the required cap within remaining unsacrificed salary', () => {
    const issues = validatePlan(
      plan({
        facts: facts({ baseSalary: 1_000 }),
        current: allocation({ regularSalarySacrifice: 999 }),
        maxAdditionalRegularSalarySacrifice: 2,
      }),
      config,
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'additionalSacrificeExceedsCap',
        severity: 'error',
        path: 'maxAdditionalRegularSalarySacrifice',
      }),
    );
  });

  it('rejects a one-penny bonus sacrifice excess', () => {
    const issues = validatePlan(
      plan({
        facts: facts({ baseSalary: 10_000, bonus: { guidePercentage: 1_000 } }),
        current: allocation({ bonusSalarySacrifice: 1_001 }),
      }),
      config,
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'bonusSacrificeExceedsBonus',
        severity: 'error',
        path: 'current.bonusSalarySacrifice',
      }),
    );
  });

  it('rejects a one-penny regular sacrifice excess', () => {
    const issues = validatePlan(
      plan({
        facts: facts({ baseSalary: 1_000 }),
        current: allocation({ regularSalarySacrifice: 1_001 }),
      }),
      config,
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'regularSacrificeExceedsSalary',
        severity: 'error',
        path: 'current.regularSalarySacrifice',
      }),
    );
  });

  it('distinguishes errors from forecast and employer limitation warnings', () => {
    const issues = validatePlan(
      plan({
        facts: facts({
          taxableBenefits: { amount: 1, certainty: 'forecast' },
        }),
        current: allocation({ regularSalarySacrifice: 1 }),
      }),
      config,
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'forecastIncomePresent',
          severity: 'warning',
        }),
        expect.objectContaining({
          code: 'salarySacrificeLimitations',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('requires a positive target and a percentage no greater than 100%', () => {
    const issues = validatePlan(
      plan({
        targetAni: 0,
        facts: facts({ bonus: { guidePercentage: 10_001 } }),
      }),
      config,
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalidTarget', path: 'targetAni' }),
        expect.objectContaining({
          code: 'invalidPercentage',
          path: 'facts.bonus.guidePercentage',
        }),
      ]),
    );
  });
});

describe('project', () => {
  it('projects zero values without conflating employment and disposable cash', () => {
    const result = project({
      config,
      facts: facts({ baseSalary: 0 }),
      allocation: allocation(),
      targetAni: 1,
    });

    expect(result.totals).toMatchObject({
      adjustedNetIncome: 0,
      taxableIncome: 0,
      annualNetEmploymentPay: 0,
      annualDisposableCash: 0,
      averagePeriodFrequency: 'monthly',
      averagePeriodNetEmploymentPay: 0,
      averagePeriodDisposableCash: 0,
    });
    expect(result.traces.adjustedNetIncome.total).toBe(0);
  });

  it('uses gross SIPP and Gift Aid to extend the basic band while cash stays disposable', () => {
    const result = project({
      config,
      facts: facts(),
      allocation: allocation({
        sippNetContribution: 80_000,
        giftAidCashDonation: 40_000,
      }),
      targetAni: 9_850_000,
    });

    expect(result.totals).toMatchObject({
      adjustedNetIncome: 9_850_000,
      personalAllowance: 1_257_000,
      taxableIncome: 8_743_000,
      incomeTax: 2_713_200,
      annualNetEmploymentPay: 6_885_740,
      annualDisposableCash: 6_765_740,
    });
    expect(result.pension).toMatchObject({
      sippNetContribution: 80_000,
      sippGrossContribution: 100_000,
      totalPensionInput: 100_000,
    });
    expect(result.headroom.toTarget).toBe(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'smallTargetHeadroom' }),
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'pensionAllowanceLimitations' }),
    );
  });

  it('allocates Personal Allowance to non-savings income before savings income', () => {
    const result = project({
      config,
      facts: facts({
        baseSalary: 100_000,
        savingsInterest: { amount: 100_000, certainty: 'actual' },
      }),
      allocation: allocation(),
      targetAni: 200_000,
    });

    expect(result.totals).toMatchObject({
      taxableIncomeBeforePersonalAllowance: 200_000,
      taxableIncome: 0,
      incomeTax: 0,
    });
    expect(result.traces.incomeTax.total).toBe(result.totals.incomeTax);
  });

  it('returns reproducible averages for the configured pay frequency', () => {
    const result = project({
      config,
      facts: facts({
        baseSalary: 1_200,
        payroll: {
          taxCode: '1257L',
          taxCodeBasis: 'cumulative',
          payFrequency: 'weekly',
        },
      }),
      allocation: allocation(),
      targetAni: 1_200,
    });

    expect(result.totals.averagePeriodFrequency).toBe('weekly');
    expect(result.totals.averagePeriodNetEmploymentPay).toBe(23);
    expect(result.totals.averagePeriodDisposableCash).toBe(23);
  });

  it('returns tax, NI, pension, and ANI traces that reconcile to their totals', () => {
    const result = project({
      config,
      facts: facts({ employerPensionContribution: 10_000 }),
      allocation: allocation({ regularSalarySacrifice: 20_000 }),
      targetAni: 9_980_000,
    });

    expect(result.traces.adjustedNetIncome.total).toBe(
      result.totals.adjustedNetIncome,
    );
    expect(result.traces.incomeTax.total).toBe(result.totals.incomeTax);
    expect(result.traces.employeeNationalInsurance.total).toBe(
      result.totals.employeeNationalInsurance,
    );
    expect(result.traces.pension.total).toBe(result.pension.totalPensionInput);
  });
});
