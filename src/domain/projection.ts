import type { CalculationIssue, ProjectionTraces } from './calculation';
import type { MoneyPence } from './money';
import type { PayFrequency, PlanFacts, ScenarioAllocation } from './plan';
import type { TaxYearConfig } from '../tax/config/types';

export interface ProjectionTotals {
  readonly grossEmploymentIncome: MoneyPence;
  readonly taxableIncomeBeforePersonalAllowance: MoneyPence;
  readonly adjustedNetIncome: MoneyPence;
  readonly personalAllowance: MoneyPence;
  readonly taxableIncome: MoneyPence;
  readonly incomeTax: MoneyPence;
  readonly employeeNationalInsurance: MoneyPence;
  /** Cash employment pay after sacrifice, Income Tax, and employee NI. */
  readonly annualNetEmploymentPay: MoneyPence;
  /** Net employment pay after cash SIPP payments and Gift Aid donations. */
  readonly annualDisposableCash: MoneyPence;
  readonly averagePeriodNetEmploymentPay: MoneyPence;
  readonly averagePeriodDisposableCash: MoneyPence;
  readonly averagePeriodFrequency: PayFrequency;
}

export interface PensionTotals {
  readonly regularSalarySacrifice: MoneyPence;
  readonly bonusSalarySacrifice: MoneyPence;
  readonly sippNetContribution: MoneyPence;
  readonly sippGrossContribution: MoneyPence;
  readonly employerContribution: MoneyPence;
  readonly totalPensionInput: MoneyPence;
  readonly annualAllowanceRemaining: MoneyPence;
}

export interface Headroom {
  /** Positive is below the limit; negative is above it. */
  readonly toTarget: MoneyPence;
  /** Positive is below the limit; negative is above it. */
  readonly toStatutoryThreshold: MoneyPence;
  readonly forecastErrorToTarget: MoneyPence;
}

export interface PayePeriodProjection {
  readonly period: number;
  readonly grossPay: MoneyPence;
  readonly pensionSalarySacrifice: MoneyPence;
  readonly taxablePay: MoneyPence;
  readonly incomeTax: MoneyPence;
  readonly employeeNationalInsurance: MoneyPence;
  readonly netEmploymentPay: MoneyPence;
}

export interface PayeProjectionResult {
  readonly kind: 'payeAware';
  readonly frequency: PayFrequency;
  readonly nextPeriod: PayePeriodProjection;
  readonly remainingPeriods: readonly PayePeriodProjection[];
  readonly issues: readonly CalculationIssue[];
}

export interface Projection {
  readonly totals: ProjectionTotals;
  readonly pension: PensionTotals;
  readonly headroom: Headroom;
  readonly traces: ProjectionTraces;
  readonly issues: readonly CalculationIssue[];
  readonly paye?: PayeProjectionResult;
}

export interface ProjectionRequest {
  readonly config: TaxYearConfig;
  readonly facts: PlanFacts;
  readonly allocation: ScenarioAllocation;
  readonly targetAni: MoneyPence;
}
