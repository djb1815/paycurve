import type { TaxYearConfig } from './types';

/**
 * England, Wales and Northern Ireland policy for 6 April 2026 to 5 April 2027.
 *
 * The values and their primary sources are recorded in ../SOURCES.md.  This is
 * deliberately data-only: calculation modules must take their policy from the
 * configuration passed to them.
 */
export const TAX_YEAR_2026_27: TaxYearConfig = {
  id: '2026/27',
  version: '2026-27.1',
  personalAllowance: 1_257_000,
  personalAllowanceTaperThreshold: 10_000_000,
  personalAllowanceExhaustionThreshold: 12_514_000,
  personalAllowanceTaperRate: 5_000,
  incomeTaxBands: [
    { id: 'basic', width: 3_770_000, rate: 2_000 },
    { id: 'higher', width: 8_744_000, rate: 4_000 },
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
    class1EmployeeBands: [
      {
        id: 'belowPrimaryThreshold',
        lowerBound: 0,
        upperBound: 1_257_000,
        rate: 0,
      },
      { id: 'main', lowerBound: 1_257_001, upperBound: 5_027_000, rate: 800 },
      { id: 'additional', lowerBound: 5_027_001, upperBound: null, rate: 200 },
    ],
    annualised: true,
  },
  childcareAniThreshold: 10_000_000,
  pension: {
    annualAllowance: 6_000_000,
    allowanceWarningMargin: 500_000,
    reliefAtSourceBasicRate: 2_000,
  },
};
