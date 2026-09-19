import { describe, expect, it } from 'vitest';

import type { PlanFacts, ScenarioAllocation } from '../domain';
import {
  calculateAdjustedNetIncome,
  calculateEmployeeNationalInsurance,
  calculateIncomeTax,
  calculatePersonalAllowance,
  calculatePensionTotals,
  grossUpReliefAtSource,
  resolveTaxYear,
} from './index';

const config = resolveTaxYear('2026/27');

const emptyAllocation: ScenarioAllocation = {
  regularSalarySacrifice: 0,
  bonusSalarySacrifice: 0,
  sippNetContribution: 0,
  giftAidCashDonation: 0,
};

function facts(overrides: Partial<PlanFacts> = {}): PlanFacts {
  return {
    baseSalary: 0,
    bonus: { guidePercentage: 0 },
    equityIncome: [],
    taxableBenefits: { amount: 0, certainty: 'actual' },
    savingsInterest: { amount: 0, certainty: 'actual' },
    otherTaxableIncome: 0,
    employerPensionContribution: 0,
    ...overrides,
  };
}

describe('adjusted net income', () => {
  it('includes every supported income input and deducts each ANI reducer', () => {
    const result = calculateAdjustedNetIncome(
      facts({
        baseSalary: 10_000_000,
        bonus: {
          guidePercentage: 1_000,
          amountOverride: { amount: 150_000, certainty: 'forecast' },
        },
        equityIncome: [{ id: 'vest-1', amount: 250_000, certainty: 'actual' }],
        taxableBenefits: { amount: 50_000, certainty: 'actual' },
        savingsInterest: { amount: 40_000, certainty: 'forecast' },
        otherTaxableIncome: 60_000,
      }),
      {
        regularSalarySacrifice: 100_000,
        bonusSalarySacrifice: 25_000,
        sippNetContribution: 80_000,
        giftAidCashDonation: 40_000,
      },
      config,
    );

    expect(result.grossEmploymentIncome).toBe(10_450_000);
    expect(result.employmentEarningsAfterSalarySacrifice).toBe(10_275_000);
    expect(result.nonSavingsIncomeBeforePersonalAllowance).toBe(10_385_000);
    expect(result.savingsIncomeBeforePersonalAllowance).toBe(40_000);
    expect(result.totalTaxableIncomeBeforeAdjustments).toBe(10_425_000);
    expect(result.sippGrossContribution).toBe(100_000);
    expect(result.giftAidGrossDonation).toBe(50_000);
    expect(result.adjustedNetIncome).toBe(10_275_000);
    expect(result.trace.steps.map((step) => step.code)).toContain(
      'savingsInterest',
    );
  });

  it('uses the guide bonus when no override exists and gross-ups penny contributions', () => {
    expect(
      calculateAdjustedNetIncome(
        facts({ baseSalary: 1_001, bonus: { guidePercentage: 1_000 } }),
        emptyAllocation,
        config,
      ).bonusIncome,
    ).toBe(100);
    expect(grossUpReliefAtSource(1, config)).toBe(1);
    expect(grossUpReliefAtSource(2, config)).toBe(3);
  });
});

describe('Personal Allowance', () => {
  it.each([
    [9_999_999, 1_257_000],
    [10_000_000, 1_257_000],
    [10_000_001, 1_257_000],
    [10_000_002, 1_256_999],
    [12_513_999, 1],
    [12_514_000, 0],
    [12_514_001, 0],
  ])('applies taper at ANI %i', (ani, expectedAllowance) => {
    expect(calculatePersonalAllowance(ani, config).allowance).toBe(
      expectedAllowance,
    );
  });
});

describe('Income Tax', () => {
  it.each([
    [3_769_999, 754_000],
    [3_770_000, 754_000],
    [3_770_001, 754_000],
    [3_770_002, 754_001],
    [12_513_999, 4_251_600],
    [12_514_000, 4_251_600],
    [12_514_001, 4_251_600],
  ])(
    'calculates tax at and around band thresholds for %i taxable pence',
    (income, expectedTax) => {
      expect(
        calculateIncomeTax(
          { nonSavingsIncome: income, savingsIncome: 0 },
          config,
        ).tax,
      ).toBe(expectedTax);
    },
  );

  it('applies starting-rate savings then the Personal Savings Allowance', () => {
    const result = calculateIncomeTax(
      { nonSavingsIncome: 400_000, savingsIncome: 200_000 },
      config,
    );

    expect(result.startingRateSavings).toBe(100_000);
    expect(result.personalSavingsAllowance).toBe(100_000);
    expect(result.tax).toBe(80_000);
  });

  it('extends the basic-rate band for gross Gift Aid and pension payments', () => {
    expect(
      calculateIncomeTax(
        {
          nonSavingsIncome: 3_870_000,
          savingsIncome: 0,
          basicRateBandExtension: 100_000,
        },
        config,
      ).tax,
    ).toBe(774_000);
  });

  it('uses the extended higher-rate limit when selecting the savings allowance', () => {
    const higherRate = calculateIncomeTax(
      {
        nonSavingsIncome: 12_514_000,
        savingsIncome: 100_000,
        basicRateBandExtension: 100_000,
      },
      config,
    );
    const additionalRate = calculateIncomeTax(
      {
        nonSavingsIncome: 12_514_001,
        savingsIncome: 100_000,
        basicRateBandExtension: 100_000,
      },
      config,
    );

    expect(higherRate.personalSavingsAllowance).toBe(50_000);
    expect(additionalRate.personalSavingsAllowance).toBe(0);
  });
});

describe('employee Class 1 National Insurance', () => {
  it.each([
    [1_256_999, 0],
    [1_257_000, 0],
    [1_257_001, 0],
    [1_257_006, 0],
    [1_257_007, 1],
    [5_026_999, 301_600],
    [5_027_000, 301_600],
    [5_027_001, 301_600],
    [5_027_026, 301_601],
  ])(
    'calculates annual NIC at and around threshold %i',
    (earnings, expectedNic) => {
      expect(
        calculateEmployeeNationalInsurance(earnings, config).contribution,
      ).toBe(expectedNic);
    },
  );
});

describe('pension totals', () => {
  it('keeps gross SIPP and standard-allowance monitoring explicit', () => {
    const result = calculatePensionTotals(
      {
        allocation: {
          regularSalarySacrifice: 500_000,
          bonusSalarySacrifice: 100_000,
          sippNetContribution: 80_000,
          giftAidCashDonation: 0,
        },
        employerPensionContribution: 5_000_000,
      },
      config,
    );

    expect(result.sippGrossContribution).toBe(100_000);
    expect(result.totalPensionInput).toBe(5_700_000);
    expect(result.annualAllowanceRemaining).toBe(300_000);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'pensionAllowanceApproached' }),
    ]);
  });

  it('flags a one-penny annual-allowance excess', () => {
    const result = calculatePensionTotals(
      {
        allocation: { ...emptyAllocation, regularSalarySacrifice: 6_000_001 },
        employerPensionContribution: 0,
      },
      config,
    );

    expect(result.annualAllowanceRemaining).toBe(-1);
    expect(result.issues[0]).toMatchObject({
      code: 'pensionAllowanceExceeded',
      parameters: { excess: 1 },
    });
  });
});
