import type { CalculationIssue } from '../domain/calculation';
import type { MoneyPence } from '../domain/money';
import type {
  CurvePoint,
  CurveRequest,
  OptimisationRequest,
  OptimisationResult,
  ScenarioAllocation,
} from '../domain';
import { project } from '../projection';

function hasErrors(issues: readonly CalculationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

function isPence(value: number): value is MoneyPence {
  return Number.isSafeInteger(value) && value >= 0;
}

function optimisationInputIssues(
  request: OptimisationRequest,
): readonly CalculationIssue[] {
  const issues: CalculationIssue[] = [];
  const { current, facts, maxAdditionalRegularSalarySacrifice } = request;
  const remainingSalary = facts.baseSalary - current.regularSalarySacrifice;

  if (!isPence(maxAdditionalRegularSalarySacrifice)) {
    issues.push({
      code: 'negativeAmount',
      severity: 'error',
      path: 'maxAdditionalRegularSalarySacrifice',
      parameters: { value: maxAdditionalRegularSalarySacrifice },
    });
  } else if (
    Number.isSafeInteger(remainingSalary) &&
    remainingSalary >= 0 &&
    maxAdditionalRegularSalarySacrifice > remainingSalary
  ) {
    issues.push({
      code: 'additionalSacrificeExceedsCap',
      severity: 'error',
      path: 'maxAdditionalRegularSalarySacrifice',
      parameters: {
        currentRegularSalarySacrifice: current.regularSalarySacrifice,
        maxAdditionalRegularSalarySacrifice,
        baseSalary: facts.baseSalary,
      },
    });
  }

  return issues;
}

function maximumAdditional(request: OptimisationRequest): MoneyPence {
  const remainingSalary =
    request.facts.baseSalary - request.current.regularSalarySacrifice;
  if (
    !isPence(request.maxAdditionalRegularSalarySacrifice) ||
    !isPence(remainingSalary)
  ) {
    return 0;
  }
  return Math.min(request.maxAdditionalRegularSalarySacrifice, remainingSalary);
}

function allocationAt(
  current: ScenarioAllocation,
  additionalRegularSalarySacrifice: MoneyPence,
): ScenarioAllocation {
  return {
    ...current,
    regularSalarySacrifice:
      current.regularSalarySacrifice + additionalRegularSalarySacrifice,
  };
}

function projectionAt(
  request: OptimisationRequest,
  additionalRegularSalarySacrifice: MoneyPence,
) {
  return project({
    config: request.config,
    facts: request.facts,
    allocation: allocationAt(request.current, additionalRegularSalarySacrifice),
    targetAni: request.targetAni,
  });
}

function invalidResult(
  request: OptimisationRequest,
  currentIssues: readonly CalculationIssue[],
): OptimisationResult {
  const permittedAdditional = maximumAdditional(request);
  const allocation = allocationAt(request.current, permittedAdditional);
  const projection = project({
    config: request.config,
    facts: request.facts,
    allocation,
    targetAni: request.targetAni,
  });

  return {
    kind: 'unreachable',
    maximumAllocation: allocation,
    projection,
    shortfall: Math.max(
      0,
      projection.totals.adjustedNetIncome - request.targetAni,
    ),
    issues: [...currentIssues, ...projection.issues],
  };
}

/**
 * Finds the first whole-penny regular salary sacrifice that satisfies the ANI
 * target. ANI is monotonic as regular sacrifice increases, so a binary search
 * proves that the returned reached value has no smaller satisfying penny.
 */
export function optimiseToTarget(
  request: OptimisationRequest,
): OptimisationResult {
  const currentProjection = projectionAt(request, 0);
  const inputIssues = optimisationInputIssues(request);
  if (hasErrors(currentProjection.issues) || inputIssues.length > 0) {
    return invalidResult(request, inputIssues);
  }

  if (currentProjection.totals.adjustedNetIncome <= request.targetAni) {
    return {
      kind: 'alreadyAtOrBelow',
      allocation: request.current,
      projection: currentProjection,
    };
  }

  const maxAdditional = maximumAdditional(request);
  const maximumAllocation = allocationAt(request.current, maxAdditional);
  const maximumProjection = projectionAt(request, maxAdditional);
  if (maximumProjection.totals.adjustedNetIncome > request.targetAni) {
    return {
      kind: 'unreachable',
      maximumAllocation,
      projection: maximumProjection,
      shortfall: maximumProjection.totals.adjustedNetIncome - request.targetAni,
      issues: maximumProjection.issues,
    };
  }

  let lower = 0;
  let upper = maxAdditional;
  while (lower < upper) {
    const midpoint = lower + Math.floor((upper - lower) / 2);
    const midpointProjection = projectionAt(request, midpoint);
    if (midpointProjection.totals.adjustedNetIncome <= request.targetAni) {
      upper = midpoint;
    } else {
      lower = midpoint + 1;
    }
  }

  const allocation = allocationAt(request.current, lower);
  return {
    kind: 'reached',
    additionalRegularSalarySacrifice: lower,
    allocation,
    projection: projectionAt(request, lower),
  };
}

function addIfInRange(
  amounts: Set<MoneyPence>,
  amount: number,
  maximum: MoneyPence,
): void {
  if (Number.isSafeInteger(amount) && amount >= 0 && amount <= maximum) {
    amounts.add(amount);
  }
}

function breakpointAmounts(
  request: CurveRequest,
  currentAni: MoneyPence,
): readonly MoneyPence[] {
  return [
    currentAni - request.targetAni,
    currentAni - request.config.childcareAniThreshold,
    currentAni - request.config.personalAllowanceTaperThreshold,
    currentAni - request.config.personalAllowanceExhaustionThreshold,
  ];
}

function addPriority(
  amounts: Set<MoneyPence>,
  amount: number,
  maximum: MoneyPence,
  maxPoints: number,
): void {
  if (amounts.size < maxPoints) {
    addIfInRange(amounts, amount, maximum);
  }
}

/**
 * Samples the Current allocation at regular-sacrifice values. Markers are
 * inserted before evenly spaced samples so targets and scenario positions are
 * never rounded away; all returned points remain a single comparable curve.
 */
export function sampleSacrificeCurve(
  request: CurveRequest,
): readonly CurvePoint[] {
  if (!Number.isSafeInteger(request.maxPoints) || request.maxPoints <= 0) {
    return [];
  }

  const optimisation = optimiseToTarget(request);
  if (optimisation.kind === 'unreachable' && hasErrors(optimisation.issues)) {
    return [];
  }

  const maximum = maximumAdditional(request);
  const currentAni = projectionAt(request, 0).totals.adjustedNetIncome;
  const priorities: number[] = [0];
  if (request.maxPoints > 1) priorities.push(maximum);
  if (optimisation.kind === 'reached') {
    priorities.push(optimisation.additionalRegularSalarySacrifice);
  }
  if (request.alternative !== undefined) {
    priorities.push(
      request.alternative.regularSalarySacrifice -
        request.current.regularSalarySacrifice,
    );
  }
  priorities.push(...breakpointAmounts(request, currentAni));

  const amounts = new Set<MoneyPence>();
  for (const amount of priorities) {
    addPriority(amounts, amount, maximum, request.maxPoints);
  }

  for (
    let index = 1;
    amounts.size < request.maxPoints && index < request.maxPoints - 1;
    index += 1
  ) {
    addIfInRange(
      amounts,
      Math.round((maximum * index) / (request.maxPoints - 1)),
      maximum,
    );
  }

  return [...amounts]
    .sort((left, right) => left - right)
    .map((additionalRegularSalarySacrifice) => ({
      additionalRegularSalarySacrifice,
      projection: projectionAt(request, additionalRegularSalarySacrifice),
    }));
}
