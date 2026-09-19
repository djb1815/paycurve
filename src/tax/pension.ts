import type {
  CalculationIssue,
  CalculationTrace,
  TraceStep,
} from '../domain/calculation';
import type { MoneyPence } from '../domain/money';
import type { ScenarioAllocation } from '../domain/plan';
import type { TaxYearConfig } from './config/types';
import { grossUpReliefAtSource } from './ani';

export interface PensionCalculationInput {
  readonly allocation: ScenarioAllocation;
  readonly employerPensionContribution: MoneyPence;
}

export interface PensionCalculation {
  readonly sippGrossContribution: MoneyPence;
  readonly totalPensionInput: MoneyPence;
  /** Negative when the modelled input exceeds the standard annual allowance. */
  readonly annualAllowanceRemaining: MoneyPence;
  readonly issues: readonly CalculationIssue[];
  readonly trace: CalculationTrace;
}

export function calculatePensionTotals(
  input: PensionCalculationInput,
  config: TaxYearConfig,
): PensionCalculation {
  const { allocation } = input;
  const sippGrossContribution = grossUpReliefAtSource(
    allocation.sippNetContribution,
    config,
  );
  const totalPensionInput =
    allocation.regularSalarySacrifice +
    allocation.bonusSalarySacrifice +
    sippGrossContribution +
    input.employerPensionContribution;
  const annualAllowanceRemaining =
    config.pension.annualAllowance - totalPensionInput;
  const issues: CalculationIssue[] = [];
  if (annualAllowanceRemaining < 0) {
    issues.push({
      code: 'pensionAllowanceExceeded',
      severity: 'warning',
      parameters: { excess: -annualAllowanceRemaining },
    });
  } else if (
    annualAllowanceRemaining <= config.pension.allowanceWarningMargin
  ) {
    issues.push({
      code: 'pensionAllowanceApproached',
      severity: 'warning',
      parameters: {
        remaining: annualAllowanceRemaining,
        warningMargin: config.pension.allowanceWarningMargin,
      },
    });
  }
  const steps: readonly TraceStep[] = [
    {
      code: 'regularSalarySacrifice',
      operation: 'input',
      amount: allocation.regularSalarySacrifice,
    },
    {
      code: 'bonusSalarySacrifice',
      operation: 'add',
      amount: allocation.bonusSalarySacrifice,
    },
    {
      code: 'sippNetContribution',
      operation: 'input',
      amount: allocation.sippNetContribution,
    },
    {
      code: 'sippGrossContribution',
      operation: 'add',
      amount: sippGrossContribution,
    },
    {
      code: 'employerPensionContribution',
      operation: 'add',
      amount: input.employerPensionContribution,
    },
    {
      code: 'totalPensionInput',
      operation: 'result',
      amount: totalPensionInput,
      runningTotal: totalPensionInput,
    },
  ];

  return {
    sippGrossContribution,
    totalPensionInput,
    annualAllowanceRemaining,
    issues,
    trace: { steps, total: totalPensionInput },
  };
}
