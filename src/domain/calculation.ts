import type { BasisPoints, MoneyPence } from './money';

export type CalculationIssueSeverity = 'error' | 'warning' | 'information';

export type CalculationIssueCode =
  | 'negativeAmount'
  | 'invalidPercentage'
  | 'invalidTarget'
  | 'regularSacrificeExceedsSalary'
  | 'bonusSacrificeExceedsBonus'
  | 'additionalSacrificeExceedsCap'
  | 'aniAboveStatutoryThreshold'
  | 'smallTargetHeadroom'
  | 'pensionAllowanceApproached'
  | 'pensionAllowanceExceeded'
  | 'pensionAllowanceLimitations'
  | 'salarySacrificeLimitations'
  | 'forecastIncomePresent'
  | 'unsupportedTaxCode'
  | 'incompletePayrollInputs';

export interface CalculationIssue {
  readonly code: CalculationIssueCode;
  readonly severity: CalculationIssueSeverity;
  /** Stable input path when the issue is associated with a specific value. */
  readonly path?: string;
  /** Values used by the presentation layer to render localised prose. */
  readonly parameters: Readonly<Record<string, number>>;
}

export type TraceOperation = 'input' | 'add' | 'subtract' | 'result';

export type TraceCode =
  | 'baseSalary'
  | 'bonusIncome'
  | 'equityIncome'
  | 'taxableBenefits'
  | 'savingsInterest'
  | 'otherTaxableIncome'
  | 'regularSalarySacrifice'
  | 'bonusSalarySacrifice'
  | 'sippGrossContribution'
  | 'giftAidGrossDonation'
  | 'adjustedNetIncome'
  | 'personalAllowance'
  | 'taxableIncome'
  | 'incomeTaxBand'
  | 'incomeTax'
  | 'nationalInsuranceBand'
  | 'employeeNationalInsurance'
  | 'sippNetContribution'
  | 'employerPensionContribution'
  | 'totalPensionInput';

export interface TraceStep {
  readonly code: TraceCode;
  readonly operation: TraceOperation;
  readonly amount: MoneyPence;
  readonly runningTotal?: MoneyPence;
  readonly rate?: BasisPoints;
  readonly parameters?: Readonly<Record<string, number>>;
}

export interface CalculationTrace {
  readonly steps: readonly TraceStep[];
  readonly total: MoneyPence;
}

export interface ProjectionTraces {
  readonly adjustedNetIncome: CalculationTrace;
  readonly incomeTax: CalculationTrace;
  readonly employeeNationalInsurance: CalculationTrace;
  readonly pension: CalculationTrace;
}
