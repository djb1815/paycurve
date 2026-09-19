import type {
  ComparisonRequest,
  ProjectedScenario,
  ScenarioComparison,
  ScenarioDelta,
} from '../domain';

function delta(
  scenario: ProjectedScenario,
  current: ProjectedScenario,
): ScenarioDelta {
  return {
    adjustedNetIncome:
      scenario.projection.totals.adjustedNetIncome -
      current.projection.totals.adjustedNetIncome,
    annualNetEmploymentPay:
      scenario.projection.totals.annualNetEmploymentPay -
      current.projection.totals.annualNetEmploymentPay,
    annualDisposableCash:
      scenario.projection.totals.annualDisposableCash -
      current.projection.totals.annualDisposableCash,
    incomeTax:
      scenario.projection.totals.incomeTax -
      current.projection.totals.incomeTax,
    employeeNationalInsurance:
      scenario.projection.totals.employeeNationalInsurance -
      current.projection.totals.employeeNationalInsurance,
    totalPensionInput:
      scenario.projection.pension.totalPensionInput -
      current.projection.pension.totalPensionInput,
  };
}

/** Returns signed scenario deltas, always measured relative to Current. */
export function compareScenarios(
  request: ComparisonRequest,
): ScenarioComparison {
  const optimalVersusCurrent =
    request.optimal.kind === 'unreachable'
      ? undefined
      : delta(
          {
            id: 'optimal',
            allocation: request.optimal.allocation,
            projection: request.optimal.projection,
          },
          request.current,
        );

  return {
    current: request.current,
    optimal: request.optimal,
    alternative: request.alternative,
    ...(optimalVersusCurrent === undefined ? {} : { optimalVersusCurrent }),
    alternativeVersusCurrent: delta(request.alternative, request.current),
  };
}
