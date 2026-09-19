import type { CalculationIssue } from '../domain/calculation';
import type { MoneyPence } from '../domain/money';
import type { PayFrequency } from '../domain/plan';
import type { Projection, ProjectionRequest } from '../domain/projection';
import {
  calculateAdjustedNetIncome,
  calculateEmployeeNationalInsurance,
  calculateIncomeTax,
  calculatePensionTotals,
  calculatePersonalAllowance,
} from '../tax';
import type { TaxYearConfig } from '../tax/config/types';
import { validateProjectionInputs } from './validation';

const periodsPerYear: Readonly<Record<PayFrequency, number>> = {
  monthly: 12,
  fourWeekly: 13,
  fortnightly: 26,
  weekly: 52,
};

function divideRounded(amount: MoneyPence, divisor: number): MoneyPence {
  if (amount >= 0) {
    return Math.floor((amount + divisor / 2) / divisor);
  }
  return -Math.floor((-amount + divisor / 2) / divisor);
}

function calculateTaxableIncome(
  nonSavingsBeforeAllowance: MoneyPence,
  savingsBeforeAllowance: MoneyPence,
  personalAllowance: MoneyPence,
): {
  readonly nonSavingsIncome: MoneyPence;
  readonly savingsIncome: MoneyPence;
  readonly taxableIncome: MoneyPence;
} {
  const nonSavingsIncome = Math.max(
    0,
    nonSavingsBeforeAllowance - personalAllowance,
  );
  const savingsAllowance = Math.max(
    0,
    personalAllowance - nonSavingsBeforeAllowance,
  );
  const savingsIncome = Math.max(0, savingsBeforeAllowance - savingsAllowance);
  return {
    nonSavingsIncome,
    savingsIncome,
    taxableIncome: nonSavingsIncome + savingsIncome,
  };
}

function appendProjectionWarnings(
  issues: CalculationIssue[],
  adjustedNetIncome: MoneyPence,
  targetAni: MoneyPence,
  config: TaxYearConfig,
  pensionInput: MoneyPence,
): void {
  if (adjustedNetIncome > config.childcareAniThreshold) {
    issues.push({
      code: 'aniAboveStatutoryThreshold',
      severity: 'warning',
      parameters: {
        excess: adjustedNetIncome - config.childcareAniThreshold,
        threshold: config.childcareAniThreshold,
      },
    });
  }
  if (adjustedNetIncome === targetAni) {
    issues.push({
      code: 'smallTargetHeadroom',
      severity: 'warning',
      parameters: { headroom: 0, targetAni },
    });
  }
  if (pensionInput > 0) {
    issues.push({
      code: 'pensionAllowanceLimitations',
      severity: 'warning',
      parameters: { annualAllowance: config.pension.annualAllowance },
    });
  }
}

/**
 * Produces the deterministic annual source of truth used by scenario views and
 * later optimisation.  PAYE-period forecasts deliberately remain in T05.
 */
export function project(request: ProjectionRequest): Projection {
  const { config, facts, allocation, targetAni } = request;
  const annualInputs = calculateAdjustedNetIncome(facts, allocation, config);
  const personalAllowance = calculatePersonalAllowance(
    annualInputs.adjustedNetIncome,
    config,
  );
  const taxable = calculateTaxableIncome(
    annualInputs.nonSavingsIncomeBeforePersonalAllowance,
    annualInputs.savingsIncomeBeforePersonalAllowance,
    personalAllowance.allowance,
  );
  const bandExtension =
    annualInputs.sippGrossContribution + annualInputs.giftAidGrossDonation;
  const incomeTax = calculateIncomeTax(
    {
      nonSavingsIncome: taxable.nonSavingsIncome,
      savingsIncome: taxable.savingsIncome,
      basicRateBandExtension: bandExtension,
    },
    config,
  );
  const nationalInsurance = calculateEmployeeNationalInsurance(
    annualInputs.employmentEarningsAfterSalarySacrifice,
    config,
  );
  const pension = calculatePensionTotals(
    {
      allocation,
      employerPensionContribution: facts.employerPensionContribution,
    },
    config,
  );
  const annualNetEmploymentPay =
    annualInputs.employmentEarningsAfterSalarySacrifice -
    incomeTax.tax -
    nationalInsurance.contribution;
  const annualDisposableCash =
    annualNetEmploymentPay -
    allocation.sippNetContribution -
    allocation.giftAidCashDonation;
  const averagePeriodFrequency = facts.payroll?.payFrequency ?? 'monthly';
  const periodCount = periodsPerYear[averagePeriodFrequency];
  const issues = [
    ...validateProjectionInputs(facts, allocation, targetAni),
    ...pension.issues,
  ];
  appendProjectionWarnings(
    issues,
    annualInputs.adjustedNetIncome,
    targetAni,
    config,
    pension.totalPensionInput,
  );

  return {
    totals: {
      grossEmploymentIncome: annualInputs.grossEmploymentIncome,
      taxableIncomeBeforePersonalAllowance:
        annualInputs.totalTaxableIncomeBeforeAdjustments,
      adjustedNetIncome: annualInputs.adjustedNetIncome,
      personalAllowance: personalAllowance.allowance,
      taxableIncome: taxable.taxableIncome,
      incomeTax: incomeTax.tax,
      employeeNationalInsurance: nationalInsurance.contribution,
      annualNetEmploymentPay,
      annualDisposableCash,
      averagePeriodNetEmploymentPay: divideRounded(
        annualNetEmploymentPay,
        periodCount,
      ),
      averagePeriodDisposableCash: divideRounded(
        annualDisposableCash,
        periodCount,
      ),
      averagePeriodFrequency,
    },
    pension: {
      regularSalarySacrifice: allocation.regularSalarySacrifice,
      bonusSalarySacrifice: allocation.bonusSalarySacrifice,
      sippNetContribution: allocation.sippNetContribution,
      sippGrossContribution: pension.sippGrossContribution,
      employerContribution: facts.employerPensionContribution,
      totalPensionInput: pension.totalPensionInput,
      annualAllowanceRemaining: pension.annualAllowanceRemaining,
    },
    headroom: {
      toTarget: targetAni - annualInputs.adjustedNetIncome,
      toStatutoryThreshold:
        config.childcareAniThreshold - annualInputs.adjustedNetIncome,
      forecastErrorToTarget: targetAni - annualInputs.adjustedNetIncome,
    },
    traces: {
      adjustedNetIncome: annualInputs.trace,
      incomeTax: incomeTax.trace,
      employeeNationalInsurance: nationalInsurance.trace,
      pension: pension.trace,
    },
    issues,
  };
}

export type { ProjectionRequest } from '../domain/projection';
export type { PlanFacts, ScenarioAllocation } from '../domain/plan';
