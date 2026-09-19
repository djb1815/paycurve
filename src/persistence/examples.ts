import { CURRENT_SCHEMA_VERSION, type SavedPlan } from './contracts';

export const savedPlanExample: SavedPlan = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  exportedAt: '2026-09-19T12:00:00.000Z',
  taxYear: '2026/27',
  taxConfigVersion: '2026-27.1',
  plan: {
    taxYear: '2026/27',
    targetAni: 10_000_000,
    maxAdditionalRegularSalarySacrifice: 250_000,
    facts: {
      baseSalary: 12_000_000,
      bonus: { guidePercentage: 1_000 },
      equityIncome: [],
      taxableBenefits: { amount: 0, certainty: 'actual' },
      savingsInterest: { amount: 0, certainty: 'forecast' },
      otherTaxableIncome: 0,
      employerPensionContribution: 0,
    },
    current: {
      regularSalarySacrifice: 0,
      bonusSalarySacrifice: 0,
      sippNetContribution: 0,
      giftAidCashDonation: 0,
    },
    alternative: {
      regularSalarySacrifice: 250_000,
      bonusSalarySacrifice: 0,
      sippNetContribution: 0,
      giftAidCashDonation: 0,
    },
  },
};

/** Version 0 did not record a tax configuration version. Migrate only with an active config. */
export const savedPlanV0Example: Omit<
  SavedPlan,
  'taxConfigVersion' | 'schemaVersion'
> & {
  readonly schemaVersion: 0;
} = {
  schemaVersion: 0,
  exportedAt: savedPlanExample.exportedAt,
  taxYear: savedPlanExample.taxYear,
  plan: savedPlanExample.plan,
};
