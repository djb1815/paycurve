import type {
  BasisPoints,
  EstimatedAmount,
  MoneyPence,
  TaxYearId,
} from './money';

export interface BonusInput {
  /** Percentage of base salary, expressed in basis points. */
  readonly guidePercentage: BasisPoints;
  /** When absent, the guide amount is used as a forecast. */
  readonly amountOverride?: EstimatedAmount;
}

export interface EquityIncomeInput extends EstimatedAmount {
  readonly id: string;
  readonly label?: string;
  /** ISO 8601 calendar date, retained for future event-based projections. */
  readonly vestDate?: string;
}

export type PayFrequency = 'monthly' | 'fourWeekly' | 'fortnightly' | 'weekly';

export type TaxCodeBasis = 'cumulative' | 'month1Week1';

export interface PayrollYearToDate {
  /** One-based completed tax period. */
  readonly completedPeriods: number;
  readonly taxablePay: MoneyPence;
  readonly incomeTaxPaid: MoneyPence;
}

export interface PayrollInputs {
  readonly taxCode: string;
  readonly taxCodeBasis: TaxCodeBasis;
  readonly payFrequency: PayFrequency;
  /** Bonus or other employment income expected in the next payroll period. */
  readonly nextPeriodAdditionalGrossPay?: MoneyPence;
  readonly yearToDate?: PayrollYearToDate;
}

export interface PlanFacts {
  /** Contractual annual salary before any salary sacrifice. */
  readonly baseSalary: MoneyPence;
  readonly bonus: BonusInput;
  readonly equityIncome: readonly EquityIncomeInput[];
  readonly taxableBenefits: EstimatedAmount;
  readonly savingsInterest: EstimatedAmount;
  readonly otherTaxableIncome: MoneyPence;
  readonly employerPensionContribution: MoneyPence;
  readonly payroll?: PayrollInputs;
}

export interface ScenarioAllocation {
  /** Total annual regular sacrifice, including any already committed amount. */
  readonly regularSalarySacrifice: MoneyPence;
  readonly bonusSalarySacrifice: MoneyPence;
  /** Relief-at-source amount paid by the user, before provider tax relief. */
  readonly sippNetContribution: MoneyPence;
  /** Cash amount donated, before Gift Aid gross-up. */
  readonly giftAidCashDonation: MoneyPence;
}

export interface PlannerState {
  readonly taxYear: TaxYearId;
  readonly targetAni: MoneyPence;
  readonly maxAdditionalRegularSalarySacrifice: MoneyPence;
  readonly facts: PlanFacts;
  readonly current: ScenarioAllocation;
  readonly alternative: ScenarioAllocation;
}

export type ScenarioId = 'current' | 'optimal' | 'alternative';
