import type {
  CalculationIssue,
  CalculationTrace as DomainCalculationTrace,
  PlanFacts,
  Projection,
  ScenarioId,
} from '../domain';
import type { ChartMarker, ChartPoint } from '../features/chart';
import type { PlanningReport } from '../features/report';
import type { ScenarioCardData } from '../features/scenarios';
import type { SettingsImportError } from '../features/settings';
import type { SummaryOutcome } from '../features/summary';
import type { CalculationTrace } from '../features/traces';
import type { PayeProjectionResult } from '../payroll';
import { selectResultsAreStale, selectScenarioViewModel } from '../state';
import type { PlannerStoreState } from '../state';

import { formatPounds } from './format';

function certaintyForFacts(facts: PlanFacts): 'actual' | 'forecast' | 'mixed' {
  const certainties = [
    facts.bonus.amountOverride?.certainty ?? 'forecast',
    facts.taxableBenefits.certainty,
    facts.savingsInterest.certainty,
    ...facts.equityIncome.map((income) => income.certainty),
  ];
  return certainties.every((certainty) => certainty === 'actual')
    ? 'actual'
    : certainties.every((certainty) => certainty === 'forecast')
      ? 'forecast'
      : 'mixed';
}

function traceView(
  id: string,
  title: string,
  trace: DomainCalculationTrace,
): CalculationTrace {
  return {
    id,
    title,
    summary: `How ${formatPounds(trace.total)} was derived`,
    lines: trace.steps.map((step, index) => ({
      id: `${id}-${index}-${step.code}`,
      code: step.code,
      formattedAmount:
        step.operation === 'subtract'
          ? `−${formatPounds(Math.abs(step.amount))}`
          : formatPounds(step.amount),
      operation: step.operation,
    })),
    total: {
      formattedAmount: formatPounds(trace.total),
      label: 'Calculated total',
    },
  };
}

export function tracesFor(projection: Projection): readonly CalculationTrace[] {
  return [
    traceView(
      'ani',
      'Adjusted net income',
      projection.traces.adjustedNetIncome,
    ),
    traceView('income-tax', 'Income Tax', projection.traces.incomeTax),
    traceView(
      'national-insurance',
      'Employee National Insurance',
      projection.traces.employeeNationalInsurance,
    ),
    traceView('pension', 'Pension input', projection.traces.pension),
  ];
}

function scenarioLabel(id: ScenarioId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function targetPosition(headroom: number): string {
  if (headroom === 0) return 'At target';
  return `${formatPounds(Math.abs(headroom))} ${headroom > 0 ? 'below' : 'above'} target`;
}

export function scenarioCards(
  state: PlannerStoreState,
): readonly ScenarioCardData[] {
  const current = state.derived.current.projection;
  const alternative = state.derived.alternative.projection;
  const optimal = state.derived.optimal;
  const card = (
    id: ScenarioId,
    name: string,
    description: string,
    projection: Projection,
  ): ScenarioCardData => ({
    id,
    name,
    description,
    adjustedNetIncome: formatPounds(projection.totals.adjustedNetIncome),
    annualNetEmploymentPay: formatPounds(
      projection.totals.annualNetEmploymentPay,
    ),
    annualDisposableCash: formatPounds(projection.totals.annualDisposableCash),
    annualPensionInput: formatPounds(projection.pension.totalPensionInput),
    targetHeadroom: targetPosition(projection.headroom.toTarget),
  });
  return [
    card('current', 'Current', 'Your currently intended allocation.', current),
    card(
      'optimal',
      optimal.kind === 'unreachable' ? 'Optimal limit' : 'Optimal',
      optimal.kind === 'unreachable'
        ? 'The maximum permitted regular sacrifice; it does not reach the target.'
        : 'Minimum regular sacrifice needed to reach the target.',
      optimal.projection,
    ),
    card(
      'alternative',
      'Alternative',
      'A sandbox for another allocation.',
      alternative,
    ),
  ];
}

export function curvePoints(state: PlannerStoreState): readonly ChartPoint[] {
  const currentRegular = state.plan.current.regularSalarySacrifice;
  const optimal = state.derived.optimal;
  const alternativeAdditional =
    state.plan.alternative.regularSalarySacrifice - currentRegular;
  const optimalAdditional =
    optimal.kind === 'reached' ? optimal.additionalRegularSalarySacrifice : 0;
  return state.derived.curve.map((point) => {
    const { projection } = point;
    const markers = [
      point.additionalRegularSalarySacrifice === 0 ? 'Current' : undefined,
      point.additionalRegularSalarySacrifice === optimalAdditional &&
      optimal.kind !== 'unreachable'
        ? 'Optimal'
        : undefined,
      point.additionalRegularSalarySacrifice === alternativeAdditional
        ? 'Alternative'
        : undefined,
    ].filter((marker): marker is string => marker !== undefined);
    return {
      sacrifice: formatPounds(point.additionalRegularSalarySacrifice),
      adjustedNetIncome: formatPounds(projection.totals.adjustedNetIncome),
      annualNetEmploymentPay: formatPounds(
        projection.totals.annualNetEmploymentPay,
      ),
      disposableCash: formatPounds(projection.totals.annualDisposableCash),
      pensionInput: formatPounds(projection.pension.totalPensionInput),
      ...(markers.length > 0 ? { marker: markers.join(' · ') } : {}),
      values: {
        sacrificePence: point.additionalRegularSalarySacrifice,
        adjustedNetIncomePence: projection.totals.adjustedNetIncome,
        annualNetEmploymentPayPence: projection.totals.annualNetEmploymentPay,
        annualDisposableCashPence: projection.totals.annualDisposableCash,
        pensionInputPence: projection.pension.totalPensionInput,
      },
    };
  });
}

export function curveMarkers(state: PlannerStoreState): readonly ChartMarker[] {
  const config = state.derived.config;
  return [
    { id: 'current', label: 'Current' },
    { id: 'optimal', label: 'Optimal' },
    { id: 'alternative', label: 'Alternative' },
    {
      id: 'target',
      label: 'ANI target',
      description: formatPounds(state.plan.targetAni),
    },
    {
      id: 'statutoryThreshold',
      label: 'Statutory threshold',
      description: `${formatPounds(config.childcareAniThreshold)} ANI`,
    },
    {
      id: 'personalAllowanceBreakpoint',
      label: 'Personal Allowance taper begins',
      description: formatPounds(config.personalAllowanceTaperThreshold),
    },
  ];
}

export function selectedCurveIndex(state: PlannerStoreState): number {
  const target =
    state.plan.alternative.regularSalarySacrifice -
    state.plan.current.regularSalarySacrifice;
  const exact = state.derived.curve.findIndex(
    (point) => point.additionalRegularSalarySacrifice === target,
  );
  if (exact >= 0) return exact;
  return state.derived.curve.reduce(
    (nearest, point, index) =>
      Math.abs(point.additionalRegularSalarySacrifice - target) <
      Math.abs(
        state.derived.curve[nearest]!.additionalRegularSalarySacrifice - target,
      )
        ? index
        : nearest,
    0,
  );
}

export function payeStatus(paye: PayeProjectionResult): string {
  if (paye.kind === 'supported') {
    return `PAYE-aware next ${paye.frequency} payslip estimate is available for tax code ${paye.taxCode.code}.`;
  }
  if (paye.kind === 'insufficientInputs') {
    return 'Add optional PAYE details to see a next-payslip estimate; annual planning results are still available.';
  }
  return 'PAYE-aware estimate is unavailable because the supplied payroll details need attention.';
}

function payeIssue(paye: PayeProjectionResult): readonly CalculationIssue[] {
  if (paye.kind === 'supported' || paye.kind === 'insufficientInputs')
    return [];
  return paye.reasons.some((reason) => reason.code === 'unsupportedTaxCode')
    ? [{ code: 'unsupportedTaxCode', severity: 'warning', parameters: {} }]
    : [
        {
          code: 'incompletePayrollInputs',
          severity: 'information',
          parameters: {},
        },
      ];
}

export function summaryOutcome(
  state: PlannerStoreState,
  selectedScenario: ScenarioId,
): SummaryOutcome {
  const selected = selectScenarioViewModel(state, selectedScenario).projection;
  const comparison = state.derived.comparison;
  const paye = state.derived.paye;
  const stale = selectResultsAreStale(state);
  const includePaye =
    selectedScenario === 'current' && paye.kind === 'supported';
  return {
    scenarioLabel: scenarioLabel(selectedScenario),
    incomeStatus: certaintyForFacts(state.plan.facts),
    adjustedNetIncomePence: selected.totals.adjustedNetIncome,
    targetHeadroomPence: selected.headroom.toTarget,
    annualNetEmploymentPayPence: selected.totals.annualNetEmploymentPay,
    annualDisposableCashPence: selected.totals.annualDisposableCash,
    averagePeriodNetEmploymentPayPence:
      selected.totals.averagePeriodNetEmploymentPay,
    averagePeriodDisposableCashPence:
      selected.totals.averagePeriodDisposableCash,
    averagePeriodLabel: selected.totals.averagePeriodFrequency,
    ...(includePaye
      ? {
          payeAwareNetEmploymentPayPence: paye.nextPeriod.netEmploymentPay,
          payeAwareLabel: `PAYE-aware next ${paye.frequency} payslip net employment pay`,
        }
      : {}),
    issues: [
      ...(stale ? state.validationIssues : selected.issues),
      ...(selectedScenario === 'current' ? payeIssue(paye) : []),
    ],
    insights: stale ? [] : state.derived.insights,
    deltas: [
      ...(comparison.optimalVersusCurrent
        ? [
            {
              id: 'optimal',
              label: 'Optimal',
              adjustedNetIncomePence:
                comparison.optimalVersusCurrent.adjustedNetIncome,
              annualNetEmploymentPayPence:
                comparison.optimalVersusCurrent.annualNetEmploymentPay,
              annualDisposableCashPence:
                comparison.optimalVersusCurrent.annualDisposableCash,
            },
          ]
        : []),
      {
        id: 'alternative',
        label: 'Alternative',
        adjustedNetIncomePence:
          comparison.alternativeVersusCurrent.adjustedNetIncome,
        annualNetEmploymentPayPence:
          comparison.alternativeVersusCurrent.annualNetEmploymentPay,
        annualDisposableCashPence:
          comparison.alternativeVersusCurrent.annualDisposableCash,
      },
    ],
  };
}

export function planningReport(state: PlannerStoreState): PlanningReport {
  const scenarios = scenarioCards(state);
  const current = state.derived.current.projection;
  const issues = [...state.validationIssues, ...current.issues];
  return {
    taxYearLabel: state.plan.taxYear,
    taxConfigVersion: state.derived.config.version,
    inputs: [
      {
        id: 'base-salary',
        label: 'Base salary',
        value: formatPounds(state.plan.facts.baseSalary),
      },
      {
        id: 'bonus',
        label: 'Bonus',
        value: formatPounds(
          current.traces.adjustedNetIncome.steps.find(
            (step) => step.code === 'bonusIncome',
          )?.amount ?? 0,
        ),
        status: state.plan.facts.bonus.amountOverride?.certainty ?? 'forecast',
      },
      {
        id: 'target-ani',
        label: 'ANI target',
        value: formatPounds(state.plan.targetAni),
      },
    ],
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      label: scenario.name,
      adjustedNetIncome: scenario.adjustedNetIncome,
      annualNetEmploymentPay: scenario.annualNetEmploymentPay ?? 'Not supplied',
      annualDisposableCash: scenario.annualDisposableCash,
      targetPosition: scenario.targetHeadroom,
    })),
    notices: issues.map((issue, index) => ({
      id: `${issue.code}-${index}`,
      severity: issue.severity,
      title: issue.code,
      body: 'See the plan notices and calculation details above for the supplied calculation context.',
    })),
    assumptions: [
      'Annual estimate for one PAYE employment in England, Wales, or Northern Ireland.',
      state.derived.paye.kind === 'supported'
        ? 'PAYE-aware figures are estimates and are not payslip reconciliation.'
        : 'PAYE-aware next-payslip figures are unavailable until sufficient payroll details are supplied.',
    ],
    traces: tracesFor(current).map((trace) => ({
      id: trace.id,
      title: trace.title,
      total: trace.total?.formattedAmount ?? '',
      lines: trace.lines.map((line) => ({
        id: line.id,
        label: line.code ?? 'Calculation item',
        value: line.formattedAmount,
      })),
    })),
    chartAlternative: {
      caption:
        'Calculated curve samples. Use this table rather than the relative plots when printing.',
      rows: curvePoints(state).map((point, index) => ({
        id: `${point.sacrifice}-${index}`,
        label: point.marker ?? `Sample ${index + 1}`,
        sacrifice: point.sacrifice,
        adjustedNetIncome: point.adjustedNetIncome,
        netEmploymentPay: point.annualNetEmploymentPay ?? 'Not supplied',
        disposableCash: point.disposableCash,
      })),
    },
  };
}

export function storageStatus(state: PlannerStoreState): string {
  switch (state.persistence.kind) {
    case 'saved':
      return 'Saved locally';
    case 'unavailable':
      return 'Local storage is unavailable; your plan remains in this tab.';
    case 'failure':
      return 'Local storage could not save this change. Your plan remains open in this tab.';
    default:
      return 'Saving locally when valid changes are made.';
  }
}

export function importError(
  state: PlannerStoreState,
): SettingsImportError | undefined {
  if (state.importStatus.kind !== 'failure') return undefined;
  const code = state.importStatus.errors[0]?.code ?? 'invalidSchema';
  const detail =
    code === 'taxConfigMismatch'
      ? 'This export uses a different tax configuration and was not applied.'
      : code === 'unsupportedSchemaVersion'
        ? 'This export uses a schema version this planner does not support.'
        : 'This file could not be imported. Check that it is a valid Paycurve plan export.';
  return { title: 'This export cannot be imported', detail };
}
