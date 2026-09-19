import type { CalculationTrace, TraceStep } from '../domain/calculation';
import type { MoneyPence } from '../domain/money';
import type { PlanFacts, ScenarioAllocation } from '../domain/plan';
import type { TaxYearConfig } from './config/types';
import { amountBeforeBasicRateRelief, percentageOf } from './math';

export interface AdjustedNetIncomeCalculation {
  readonly bonusIncome: MoneyPence;
  /** Salary, bonus, and taxable equity before salary sacrifice. */
  readonly employmentEarningsBeforeSalarySacrifice: MoneyPence;
  /** Employment earnings after salary sacrifice; suitable for Class 1 NIC. */
  readonly employmentEarningsAfterSalarySacrifice: MoneyPence;
  readonly grossEmploymentIncome: MoneyPence;
  /** Non-savings income after salary sacrifice but before Personal Allowance. */
  readonly nonSavingsIncomeBeforePersonalAllowance: MoneyPence;
  /** Savings interest before any Personal Allowance allocation. */
  readonly savingsIncomeBeforePersonalAllowance: MoneyPence;
  readonly totalTaxableIncomeBeforeAdjustments: MoneyPence;
  readonly sippGrossContribution: MoneyPence;
  readonly giftAidGrossDonation: MoneyPence;
  readonly adjustedNetIncome: MoneyPence;
  readonly trace: CalculationTrace;
}

/** Uses the override when supplied; otherwise derives a forecast bonus from base salary. */
export function calculateBonusIncome(facts: PlanFacts): MoneyPence {
  return (
    facts.bonus.amountOverride?.amount ??
    percentageOf(facts.baseSalary, facts.bonus.guidePercentage)
  );
}

export function grossUpReliefAtSource(
  netAmount: MoneyPence,
  config: TaxYearConfig,
): MoneyPence {
  return amountBeforeBasicRateRelief(
    netAmount,
    config.pension.reliefAtSourceBasicRate,
  );
}

/**
 * Calculates ANI from all MVP income inputs. Salary sacrifice reduces income
 * before it is received; relief-at-source SIPP and Gift Aid are grossed up.
 */
export function calculateAdjustedNetIncome(
  facts: PlanFacts,
  allocation: ScenarioAllocation,
  config: TaxYearConfig,
): AdjustedNetIncomeCalculation {
  const bonusIncome = calculateBonusIncome(facts);
  const equityIncome = facts.equityIncome.reduce(
    (total, income) => total + income.amount,
    0,
  );
  const employmentEarningsBeforeSalarySacrifice =
    facts.baseSalary + bonusIncome + equityIncome;
  const employmentEarningsAfterSalarySacrifice =
    employmentEarningsBeforeSalarySacrifice -
    allocation.regularSalarySacrifice -
    allocation.bonusSalarySacrifice;
  const grossEmploymentIncome =
    employmentEarningsBeforeSalarySacrifice + facts.taxableBenefits.amount;
  const nonSavingsIncomeBeforePersonalAllowance =
    employmentEarningsAfterSalarySacrifice +
    facts.taxableBenefits.amount +
    facts.otherTaxableIncome;
  const savingsIncomeBeforePersonalAllowance = facts.savingsInterest.amount;
  const incomeAfterSalarySacrifice =
    nonSavingsIncomeBeforePersonalAllowance +
    savingsIncomeBeforePersonalAllowance;
  const sippGrossContribution = grossUpReliefAtSource(
    allocation.sippNetContribution,
    config,
  );
  const giftAidGrossDonation = grossUpReliefAtSource(
    allocation.giftAidCashDonation,
    config,
  );
  const adjustedNetIncome = Math.max(
    0,
    incomeAfterSalarySacrifice - sippGrossContribution - giftAidGrossDonation,
  );
  const steps: readonly TraceStep[] = [
    {
      code: 'baseSalary',
      operation: 'input',
      amount: facts.baseSalary,
      runningTotal: facts.baseSalary,
    },
    { code: 'bonusIncome', operation: 'add', amount: bonusIncome },
    { code: 'equityIncome', operation: 'add', amount: equityIncome },
    {
      code: 'taxableBenefits',
      operation: 'add',
      amount: facts.taxableBenefits.amount,
    },
    {
      code: 'savingsInterest',
      operation: 'add',
      amount: facts.savingsInterest.amount,
    },
    {
      code: 'otherTaxableIncome',
      operation: 'add',
      amount: facts.otherTaxableIncome,
    },
    {
      code: 'regularSalarySacrifice',
      operation: 'subtract',
      amount: allocation.regularSalarySacrifice,
    },
    {
      code: 'bonusSalarySacrifice',
      operation: 'subtract',
      amount: allocation.bonusSalarySacrifice,
    },
    {
      code: 'sippGrossContribution',
      operation: 'subtract',
      amount: sippGrossContribution,
    },
    {
      code: 'giftAidGrossDonation',
      operation: 'subtract',
      amount: giftAidGrossDonation,
    },
    {
      code: 'adjustedNetIncome',
      operation: 'result',
      amount: adjustedNetIncome,
      runningTotal: adjustedNetIncome,
    },
  ];

  return {
    bonusIncome,
    employmentEarningsBeforeSalarySacrifice,
    employmentEarningsAfterSalarySacrifice,
    grossEmploymentIncome,
    nonSavingsIncomeBeforePersonalAllowance,
    savingsIncomeBeforePersonalAllowance,
    totalTaxableIncomeBeforeAdjustments: incomeAfterSalarySacrifice,
    sippGrossContribution,
    giftAidGrossDonation,
    adjustedNetIncome,
    trace: { steps, total: adjustedNetIncome },
  };
}
