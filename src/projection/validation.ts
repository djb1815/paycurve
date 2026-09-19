import type { CalculationIssue } from '../domain/calculation';
import type { MoneyPence } from '../domain/money';
import type {
  PlanFacts,
  PlannerState,
  ScenarioAllocation,
} from '../domain/plan';
import { calculateBonusIncome } from '../tax/ani';
import type { TaxYearConfig } from '../tax/config/types';

function issue(
  code: CalculationIssue['code'],
  severity: CalculationIssue['severity'],
  path: string | undefined,
  parameters: Readonly<Record<string, number>>,
): CalculationIssue {
  return {
    code,
    severity,
    ...(path === undefined ? {} : { path }),
    parameters,
  };
}

function isMoney(value: number): value is MoneyPence {
  return Number.isSafeInteger(value);
}

function validateAmount(
  value: number,
  path: string,
  issues: CalculationIssue[],
): void {
  if (!isMoney(value) || value < 0) {
    issues.push(issue('negativeAmount', 'error', path, { value }));
  }
}

function validateFacts(facts: PlanFacts, issues: CalculationIssue[]): void {
  validateAmount(facts.baseSalary, 'facts.baseSalary', issues);
  if (
    !Number.isSafeInteger(facts.bonus.guidePercentage) ||
    facts.bonus.guidePercentage < 0 ||
    facts.bonus.guidePercentage > 10_000
  ) {
    issues.push(
      issue('invalidPercentage', 'error', 'facts.bonus.guidePercentage', {
        value: facts.bonus.guidePercentage,
      }),
    );
  }
  if (facts.bonus.amountOverride !== undefined) {
    validateAmount(
      facts.bonus.amountOverride.amount,
      'facts.bonus.amountOverride.amount',
      issues,
    );
  }
  facts.equityIncome.forEach((income, index) => {
    validateAmount(income.amount, `facts.equityIncome.${index}.amount`, issues);
  });
  validateAmount(
    facts.taxableBenefits.amount,
    'facts.taxableBenefits.amount',
    issues,
  );
  validateAmount(
    facts.savingsInterest.amount,
    'facts.savingsInterest.amount',
    issues,
  );
  validateAmount(facts.otherTaxableIncome, 'facts.otherTaxableIncome', issues);
  validateAmount(
    facts.employerPensionContribution,
    'facts.employerPensionContribution',
    issues,
  );
}

function validateAllocation(
  allocation: ScenarioAllocation,
  facts: PlanFacts,
  path: string,
  issues: CalculationIssue[],
): void {
  const amounts: readonly [keyof ScenarioAllocation, MoneyPence][] = [
    ['regularSalarySacrifice', allocation.regularSalarySacrifice],
    ['bonusSalarySacrifice', allocation.bonusSalarySacrifice],
    ['sippNetContribution', allocation.sippNetContribution],
    ['giftAidCashDonation', allocation.giftAidCashDonation],
  ];
  for (const [key, value] of amounts) {
    validateAmount(value, `${path}.${key}`, issues);
  }

  if (allocation.regularSalarySacrifice > facts.baseSalary) {
    issues.push(
      issue(
        'regularSacrificeExceedsSalary',
        'error',
        `${path}.regularSalarySacrifice`,
        {
          regularSalarySacrifice: allocation.regularSalarySacrifice,
          baseSalary: facts.baseSalary,
        },
      ),
    );
  }

  const bonusIncome = calculateBonusIncome(facts);
  if (allocation.bonusSalarySacrifice > bonusIncome) {
    issues.push(
      issue(
        'bonusSacrificeExceedsBonus',
        'error',
        `${path}.bonusSalarySacrifice`,
        {
          bonusSalarySacrifice: allocation.bonusSalarySacrifice,
          bonusIncome,
        },
      ),
    );
  }
}

function hasForecastIncome(facts: PlanFacts): boolean {
  return (
    facts.bonus.amountOverride?.certainty !== 'actual' ||
    facts.taxableBenefits.certainty === 'forecast' ||
    facts.savingsInterest.certainty === 'forecast' ||
    facts.equityIncome.some((income) => income.certainty === 'forecast')
  );
}

function appendSharedWarnings(
  facts: PlanFacts,
  allocations: readonly ScenarioAllocation[],
  issues: CalculationIssue[],
): void {
  if (hasForecastIncome(facts)) {
    issues.push(issue('forecastIncomePresent', 'warning', undefined, {}));
  }
  if (
    allocations.some(
      (allocation) =>
        allocation.regularSalarySacrifice > 0 ||
        allocation.bonusSalarySacrifice > 0,
    )
  ) {
    issues.push(issue('salarySacrificeLimitations', 'warning', undefined, {}));
  }
}

/**
 * Validates editable planner inputs, including the user-entered additional
 * regular-sacrifice cap that cannot be represented by a projection request.
 */
export function validatePlan(
  plan: PlannerState,
  _config: TaxYearConfig,
): readonly CalculationIssue[] {
  const issues: CalculationIssue[] = [];
  validateFacts(plan.facts, issues);
  validateAmount(plan.targetAni, 'targetAni', issues);
  if (!isMoney(plan.targetAni) || plan.targetAni <= 0) {
    issues.push(
      issue('invalidTarget', 'error', 'targetAni', { value: plan.targetAni }),
    );
  }
  validateAmount(
    plan.maxAdditionalRegularSalarySacrifice,
    'maxAdditionalRegularSalarySacrifice',
    issues,
  );
  validateAllocation(plan.current, plan.facts, 'current', issues);
  validateAllocation(plan.alternative, plan.facts, 'alternative', issues);

  const maximumRegularSacrifice =
    plan.current.regularSalarySacrifice +
    plan.maxAdditionalRegularSalarySacrifice;
  if (maximumRegularSacrifice > plan.facts.baseSalary) {
    issues.push(
      issue(
        'additionalSacrificeExceedsCap',
        'error',
        'maxAdditionalRegularSalarySacrifice',
        {
          currentRegularSalarySacrifice: plan.current.regularSalarySacrifice,
          maxAdditionalRegularSalarySacrifice:
            plan.maxAdditionalRegularSalarySacrifice,
          baseSalary: plan.facts.baseSalary,
        },
      ),
    );
  }
  if (
    plan.alternative.regularSalarySacrifice -
      plan.current.regularSalarySacrifice >
    plan.maxAdditionalRegularSalarySacrifice
  ) {
    issues.push(
      issue(
        'additionalSacrificeExceedsCap',
        'error',
        'alternative.regularSalarySacrifice',
        {
          currentRegularSalarySacrifice: plan.current.regularSalarySacrifice,
          alternativeRegularSalarySacrifice:
            plan.alternative.regularSalarySacrifice,
          maxAdditionalRegularSalarySacrifice:
            plan.maxAdditionalRegularSalarySacrifice,
        },
      ),
    );
  }

  appendSharedWarnings(plan.facts, [plan.current, plan.alternative], issues);
  return issues;
}

/** Internal request validation shared by the annual projector. */
export function validateProjectionInputs(
  facts: PlanFacts,
  allocation: ScenarioAllocation,
  targetAni: MoneyPence,
): readonly CalculationIssue[] {
  const issues: CalculationIssue[] = [];
  validateFacts(facts, issues);
  validateAmount(targetAni, 'targetAni', issues);
  if (!isMoney(targetAni) || targetAni <= 0) {
    issues.push(
      issue('invalidTarget', 'error', 'targetAni', { value: targetAni }),
    );
  }
  validateAllocation(allocation, facts, 'allocation', issues);
  appendSharedWarnings(facts, [allocation], issues);
  return issues;
}
