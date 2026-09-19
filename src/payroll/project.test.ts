import { describe, expect, it } from 'vitest';

import type { PlanFacts, ScenarioAllocation } from '../domain';
import type { TaxYearConfig } from '../tax/config/types';
import { projectPaye } from './project';

const config = {
  id: '2026/27',
  version: 'test',
  personalAllowance: 1_257_000,
  personalAllowanceTaperThreshold: 10_000_000,
  personalAllowanceExhaustionThreshold: 12_514_000,
  personalAllowanceTaperRate: 5_000,
  incomeTaxBands: [
    { id: 'basic', width: 3_770_000, rate: 2_000 },
    { id: 'higher', width: 7_480_000, rate: 4_000 },
    { id: 'additional', width: null, rate: 4_500 },
  ],
  savingsIncome: {
    startingRateLimit: 500_000,
    startingRate: 0,
    personalSavingsAllowance: {
      basicRateTaxpayer: 100_000,
      higherRateTaxpayer: 50_000,
      additionalRateTaxpayer: 0,
    },
  },
  nationalInsurance: {
    annualised: true,
    class1EmployeeBands: [
      {
        id: 'below-primary-threshold',
        lowerBound: 0,
        upperBound: 1_257_000,
        rate: 0,
      },
      { id: 'main', lowerBound: 1_257_000, upperBound: 5_027_000, rate: 800 },
      { id: 'upper', lowerBound: 5_027_000, upperBound: null, rate: 200 },
    ],
  },
  childcareAniThreshold: 10_000_000,
  pension: {
    annualAllowance: 6_000_000,
    allowanceWarningMargin: 500_000,
    reliefAtSourceBasicRate: 2_000,
  },
} as const satisfies TaxYearConfig;

const allocation = {
  regularSalarySacrifice: 0,
  bonusSalarySacrifice: 0,
  sippNetContribution: 0,
  giftAidCashDonation: 0,
} as const satisfies ScenarioAllocation;

const facts = (payroll?: PlanFacts['payroll']): PlanFacts => ({
  baseSalary: 6_000_000,
  bonus: { guidePercentage: 0 },
  equityIncome: [],
  taxableBenefits: { amount: 0, certainty: 'forecast' },
  savingsInterest: { amount: 0, certainty: 'forecast' },
  otherTaxableIncome: 0,
  employerPensionContribution: 0,
  ...(payroll === undefined ? {} : { payroll }),
});

const request = (
  payroll?: PlanFacts['payroll'],
  overrides: Partial<ScenarioAllocation> = {},
) =>
  projectPaye({
    config,
    facts: facts(payroll),
    allocation: { ...allocation, ...overrides },
  });

describe('projectPaye', () => {
  it('reports unavailable payroll projection without payroll inputs', () => {
    expect(request()).toEqual({
      kind: 'insufficientInputs',
      reasons: [{ code: 'missingPayrollInputs', parameters: {} }],
    });
  });

  it('projects a first monthly period using an allowance tax code', () => {
    const result = request({
      taxCode: '1257L',
      taxCodeBasis: 'cumulative',
      payFrequency: 'monthly',
    });

    expect(result.kind).toBe('supported');
    if (result.kind !== 'supported') {
      return;
    }
    expect(result.taxCode).toMatchObject({
      kind: 'allowance',
      annualAllowance: 1_257_000,
    });
    expect(result.nextPeriod).toEqual({
      period: 1,
      grossPay: 500_000,
      pensionSalarySacrifice: 0,
      taxablePay: 500_000,
      incomeTax: 95_266,
      employeeNationalInsurance: 26_755,
      netEmploymentPay: 377_979,
    });
    expect(result.assumptions.map((assumption) => assumption.code)).toContain(
      'yearToDateUnavailable',
    );
  });

  it('reconciles cumulative tax with supplied YTD taxable pay and tax', () => {
    const result = request({
      taxCode: '1257L',
      taxCodeBasis: 'cumulative',
      payFrequency: 'monthly',
      yearToDate: {
        completedPeriods: 1,
        taxablePay: 500_000,
        incomeTaxPaid: 79_050,
      },
    });

    expect(result).toMatchObject({
      kind: 'supported',
      nextPeriod: { period: 2, incomeTax: 111_484 },
    });
  });

  it('uses a Month 1 basis independently of supplied YTD values', () => {
    const result = request({
      taxCode: '1257L M1',
      taxCodeBasis: 'month1Week1',
      payFrequency: 'monthly',
      yearToDate: {
        completedPeriods: 8,
        taxablePay: 4_000_000,
        incomeTaxPaid: 750_000,
      },
    });

    expect(result).toMatchObject({
      kind: 'supported',
      nextPeriod: { period: 1, incomeTax: 95_266 },
    });
    if (result.kind === 'supported') {
      expect(result.assumptions.map((assumption) => assumption.code)).toContain(
        'yearToDateIgnoredForNonCumulativeBasis',
      );
    }
  });

  it.each([
    ['monthly', 12, 500_000],
    ['fourWeekly', 13, 461_538],
    ['fortnightly', 26, 230_769],
    ['weekly', 52, 115_385],
  ] as const)(
    'uses the configured %s pay frequency',
    (payFrequency, periodsPerYear, grossPay) => {
      const result = request({
        taxCode: '1257L',
        taxCodeBasis: 'month1Week1',
        payFrequency,
      });

      expect(result.kind).toBe('supported');
      if (result.kind !== 'supported') {
        return;
      }
      expect(result.frequency).toBe(payFrequency);
      expect(result.nextPeriod.grossPay).toBe(grossPay);
      expect(result.assumptions).toContainEqual({
        code: 'periodPayDerivedFromAnnualSalary',
        parameters: { periodsPerYear },
      });
    },
  );

  it.each([
    ['BR', 100_000],
    ['D0', 200_000],
    ['D1', 225_000],
    ['0T', 137_166],
    ['NT', 0],
    ['C1257L', 95_266],
  ] as const)('interprets the common %s tax code', (taxCode, incomeTax) => {
    const result = request({
      taxCode,
      taxCodeBasis: 'month1Week1',
      payFrequency: 'monthly',
    });

    expect(result).toMatchObject({
      kind: 'supported',
      nextPeriod: { incomeTax },
    });
  });

  it('accepts a K code and makes its payroll limitation explicit', () => {
    const result = request({
      taxCode: 'K100',
      taxCodeBasis: 'month1Week1',
      payFrequency: 'monthly',
    });

    expect(result).toMatchObject({
      kind: 'supported',
      nextPeriod: { incomeTax: 140_499 },
    });
    if (result.kind === 'supported') {
      expect(result.assumptions.map((assumption) => assumption.code)).toContain(
        'kCodeTaxCapNotModelled',
      );
    }
  });

  it('includes one-off gross pay and associated bonus sacrifice in the next period', () => {
    const result = request(
      {
        taxCode: '1257L',
        taxCodeBasis: 'month1Week1',
        payFrequency: 'monthly',
        nextPeriodAdditionalGrossPay: 100_000,
      },
      { regularSalarySacrifice: 120_000, bonusSalarySacrifice: 25_000 },
    );

    expect(result).toMatchObject({
      kind: 'supported',
      nextPeriod: {
        grossPay: 600_000,
        pensionSalarySacrifice: 35_000,
        taxablePay: 565_000,
        incomeTax: 121_266,
        employeeNationalInsurance: 28_055,
        netEmploymentPay: 415_679,
      },
    });
  });

  it('applies National Insurance by pay period around primary and upper thresholds', () => {
    const atPrimaryThreshold = projectPaye({
      config,
      facts: {
        ...facts({
          taxCode: 'NT',
          taxCodeBasis: 'month1Week1',
          payFrequency: 'monthly',
        }),
        baseSalary: 1_257_000,
      },
      allocation,
    });
    const onePennyIntoMainBand = projectPaye({
      config,
      facts: {
        ...facts({
          taxCode: 'NT',
          taxCodeBasis: 'month1Week1',
          payFrequency: 'monthly',
        }),
        baseSalary: 1_257_084,
      },
      allocation,
    });
    const aboveUpperThreshold = projectPaye({
      config,
      facts: {
        ...facts({
          taxCode: 'NT',
          taxCodeBasis: 'month1Week1',
          payFrequency: 'monthly',
        }),
        baseSalary: 5_027_304,
      },
      allocation,
    });

    expect(atPrimaryThreshold).toMatchObject({
      kind: 'supported',
      nextPeriod: { employeeNationalInsurance: 0 },
    });
    expect(onePennyIntoMainBand).toMatchObject({
      kind: 'supported',
      nextPeriod: { employeeNationalInsurance: 1 },
    });
    expect(aboveUpperThreshold).toMatchObject({
      kind: 'supported',
      nextPeriod: { employeeNationalInsurance: 25_134 },
    });
  });

  it('rejects missing, unsupported, contradictory, and invalid payroll inputs', () => {
    expect(
      request({
        taxCode: '',
        taxCodeBasis: 'cumulative',
        payFrequency: 'monthly',
      }),
    ).toMatchObject({
      kind: 'invalidOrUnsupported',
      reasons: [{ code: 'missingTaxCode' }],
    });
    expect(
      request({
        taxCode: 'S1257L',
        taxCodeBasis: 'cumulative',
        payFrequency: 'monthly',
      }),
    ).toMatchObject({
      kind: 'invalidOrUnsupported',
      reasons: [{ code: 'unsupportedTaxCode' }],
    });
    expect(
      request({
        taxCode: '1257L M1',
        taxCodeBasis: 'cumulative',
        payFrequency: 'monthly',
      }),
    ).toMatchObject({
      kind: 'invalidOrUnsupported',
      reasons: [{ code: 'contradictoryTaxCodeBasis' }],
    });
    expect(
      request({
        taxCode: '1257L',
        taxCodeBasis: 'cumulative',
        payFrequency: 'monthly',
        yearToDate: { completedPeriods: 12, taxablePay: 0, incomeTaxPaid: 0 },
      }),
    ).toMatchObject({
      kind: 'invalidOrUnsupported',
      reasons: [{ code: 'invalidPayrollYearToDate' }],
    });
    const invalidAmount = projectPaye({
      config,
      facts: {
        ...facts({
          taxCode: '1257L',
          taxCodeBasis: 'cumulative',
          payFrequency: 'monthly',
        }),
        baseSalary: -1,
      },
      allocation,
    });
    expect(invalidAmount.kind).toBe('invalidOrUnsupported');
    if (invalidAmount.kind === 'invalidOrUnsupported') {
      expect(
        invalidAmount.reasons.some((reason) => reason.code === 'invalidAmount'),
      ).toBe(true);
    }
  });

  it('rejects sacrifice that cannot be assigned to the supplied next-period bonus', () => {
    const result = request(
      { taxCode: '1257L', taxCodeBasis: 'cumulative', payFrequency: 'monthly' },
      { bonusSalarySacrifice: 1 },
    );

    expect(result).toMatchObject({
      kind: 'invalidOrUnsupported',
      reasons: [{ code: 'bonusSacrificeNotAssignableToNextPeriod' }],
    });
  });
});
