import type { CalculationIssue, TraceStep } from '../domain/calculation';
import type { Insight, InsightRequest } from '../domain/insights';
import type { Projection } from '../domain/projection';

function hasIssue(
  issues: readonly CalculationIssue[],
  code: CalculationIssue['code'],
): boolean {
  return issues.some((issue) => issue.code === code);
}

function traceAmount(projection: Projection, code: TraceStep['code']): number {
  return (
    projection.traces.adjustedNetIncome.steps.find((step) => step.code === code)
      ?.amount ?? 0
  );
}

function optimalProjection(request: InsightRequest): Projection {
  return request.comparison.optimal.projection;
}

/**
 * Produces stable, presentation-neutral insight facts. Money parameters are
 * integer pence; signed change parameters are measured against Current.
 */
export function deriveInsights(request: InsightRequest): readonly Insight[] {
  const { comparison, nearThresholdMargin } = request;
  const current = comparison.current.projection;
  const optimal = optimalProjection(request);
  const insights: Insight[] = [];
  const targetHeadroom = current.headroom.toTarget;

  if (targetHeadroom < 0) {
    insights.push({
      code: 'aniAboveTarget',
      severity: 'warning',
      parameters: {
        excess: -targetHeadroom,
        targetAni: current.totals.adjustedNetIncome + targetHeadroom,
      },
    });
  } else {
    insights.push({
      code: 'aniBelowTarget',
      severity: targetHeadroom === 0 ? 'information' : 'positive',
      parameters: {
        headroom: targetHeadroom,
        targetAni: current.totals.adjustedNetIncome + targetHeadroom,
      },
    });
  }

  if (
    comparison.optimal.kind === 'reached' &&
    comparison.optimal.additionalRegularSalarySacrifice > 0
  ) {
    insights.push({
      code: 'additionalSacrificeRequired',
      severity: 'information',
      parameters: {
        amount: comparison.optimal.additionalRegularSalarySacrifice,
      },
    });
  }

  const bonusIncome = traceAmount(current, 'bonusIncome');
  const bonusSacrifice = traceAmount(current, 'bonusSalarySacrifice');
  const remainingBonus = Math.max(0, bonusIncome - bonusSacrifice);
  if (targetHeadroom < 0 && remainingBonus > 0) {
    const excess = -targetHeadroom;
    insights.push({
      code:
        remainingBonus >= excess
          ? 'fullBonusSacrificeSufficient'
          : 'fullBonusSacrificeInsufficient',
      severity: remainingBonus >= excess ? 'information' : 'warning',
      parameters:
        remainingBonus >= excess
          ? { additionalBonusSacrifice: excess, remainingBonus }
          : {
              remainingBonus,
              remainingAfterFullBonus: excess - remainingBonus,
            },
    });
  }

  if (hasIssue(current.issues, 'forecastIncomePresent')) {
    insights.push({
      code: 'forecastHeadroom',
      severity: targetHeadroom > 0 ? 'information' : 'warning',
      parameters: { headroom: Math.max(0, targetHeadroom) },
    });
  }

  const allowanceRestored =
    optimal.totals.personalAllowance - current.totals.personalAllowance;
  if (allowanceRestored > 0) {
    insights.push({
      code: 'personalAllowanceRestored',
      severity: 'positive',
      parameters: { allowanceRestored },
    });
  }

  if (comparison.optimalVersusCurrent !== undefined) {
    const additionalPensionInput =
      comparison.optimalVersusCurrent.totalPensionInput;
    const cashCost = -comparison.optimalVersusCurrent.annualDisposableCash;
    if (additionalPensionInput > 0 && cashCost >= 0) {
      insights.push({
        code: 'effectiveContributionCost',
        severity: 'information',
        parameters: { additionalPensionInput, cashCost },
      });
    }

    const averagePeriodCashChange =
      optimal.totals.averagePeriodDisposableCash -
      current.totals.averagePeriodDisposableCash;
    if (averagePeriodCashChange !== 0) {
      insights.push({
        code: 'averagePeriodCashChange',
        severity: 'information',
        parameters: {
          averagePeriodDisposableCashChange: averagePeriodCashChange,
        },
      });
    }
  }

  const statutoryHeadroom = current.headroom.toStatutoryThreshold;
  if (
    Number.isSafeInteger(nearThresholdMargin) &&
    nearThresholdMargin >= 0 &&
    Math.abs(statutoryHeadroom) <= nearThresholdMargin
  ) {
    insights.push({
      code: 'nearStatutoryThreshold',
      severity: 'warning',
      parameters: {
        headroom: statutoryHeadroom,
        threshold: current.totals.adjustedNetIncome + statutoryHeadroom,
      },
    });
  }

  if (
    hasIssue(optimal.issues, 'pensionAllowanceApproached') ||
    hasIssue(optimal.issues, 'pensionAllowanceExceeded')
  ) {
    insights.push({
      code: 'pensionAllowanceHeadroom',
      severity: 'warning',
      parameters: { remaining: optimal.pension.annualAllowanceRemaining },
    });
  }

  if (current.paye !== undefined) {
    insights.push({
      code: 'payeAwareCash',
      severity: 'information',
      parameters: {
        netEmploymentPay: current.paye.nextPeriod.netEmploymentPay,
        period: current.paye.nextPeriod.period,
      },
    });
  }

  return insights;
}
