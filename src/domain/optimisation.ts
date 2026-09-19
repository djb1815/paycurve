import type { CalculationIssue } from './calculation';
import type { MoneyPence } from './money';
import type { PlanFacts, ScenarioAllocation, ScenarioId } from './plan';
import type { Projection } from './projection';
import type { TaxYearConfig } from '../tax/config/types';

export interface OptimisationRequest {
  readonly config: TaxYearConfig;
  readonly facts: PlanFacts;
  readonly current: ScenarioAllocation;
  readonly targetAni: MoneyPence;
  readonly maxAdditionalRegularSalarySacrifice: MoneyPence;
}

export type OptimisationResult =
  | {
      readonly kind: 'alreadyAtOrBelow';
      readonly allocation: ScenarioAllocation;
      readonly projection: Projection;
    }
  | {
      readonly kind: 'reached';
      readonly additionalRegularSalarySacrifice: MoneyPence;
      readonly allocation: ScenarioAllocation;
      readonly projection: Projection;
    }
  | {
      readonly kind: 'unreachable';
      readonly maximumAllocation: ScenarioAllocation;
      readonly projection: Projection;
      readonly shortfall: MoneyPence;
      readonly issues: readonly CalculationIssue[];
    };

export interface CurveRequest extends OptimisationRequest {
  readonly alternative?: ScenarioAllocation;
  /** Maximum number of points returned, including both endpoints. */
  readonly maxPoints: number;
}

export interface CurvePoint {
  readonly additionalRegularSalarySacrifice: MoneyPence;
  readonly projection: Projection;
}

export interface ProjectedScenario {
  readonly id: ScenarioId;
  readonly allocation: ScenarioAllocation;
  readonly projection: Projection;
}

export interface ComparisonRequest {
  readonly current: ProjectedScenario;
  readonly optimal: OptimisationResult;
  readonly alternative: ProjectedScenario;
}

export interface ScenarioDelta {
  readonly adjustedNetIncome: MoneyPence;
  readonly annualNetEmploymentPay: MoneyPence;
  readonly annualDisposableCash: MoneyPence;
  readonly incomeTax: MoneyPence;
  readonly employeeNationalInsurance: MoneyPence;
  readonly totalPensionInput: MoneyPence;
}

export interface ScenarioComparison {
  readonly current: ProjectedScenario;
  readonly optimal: OptimisationResult;
  readonly alternative: ProjectedScenario;
  readonly optimalVersusCurrent?: ScenarioDelta;
  readonly alternativeVersusCurrent: ScenarioDelta;
}
