import type {
  CalculationIssue,
  CalculationTrace as DomainCalculationTrace,
  PlanFacts,
  Projection,
  ScenarioId,
} from '../domain';
import type { ChartMarker, ChartPoint } from '../features/chart';
import type { PlanningReport, ReportInput } from '../features/report';
import type { ScenarioCardData } from '../features/scenarios';
import type { SettingsImportError } from '../features/settings';
import type { SummaryOutcome } from '../features/summary';
import { insightCopy, issueCopy, messageCopy } from '../features/summary';
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

function certaintyForEquityIncome(
  equityIncome: PlanFacts['equityIncome'],
): 'actual' | 'forecast' | 'mixed' | undefined {
  if (equityIncome.length === 0) return undefined;
  const certainties = equityIncome.map((income) => income.certainty);
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
        : optimal.kind === 'alreadyAtOrBelow'
          ? 'Your current allocation already meets the target; no additional regular sacrifice is required.'
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
  const alternativeMatchesCurveAllocation =
    state.plan.alternative.bonusSalarySacrifice ===
      state.plan.current.bonusSalarySacrifice &&
    state.plan.alternative.sippNetContribution ===
      state.plan.current.sippNetContribution &&
    state.plan.alternative.giftAidCashDonation ===
      state.plan.current.giftAidCashDonation;
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
      alternativeMatchesCurveAllocation &&
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
  const action = payeUnavailableAction(paye);
  return `PAYE-aware estimate is unavailable: ${action}. Annual planning results are still available.`;
}

function payeUnavailableAction(
  paye: Exclude<
    PayeProjectionResult,
    { kind: 'supported' | 'insufficientInputs' }
  >,
): string {
  const reason = paye.reasons[0]?.code;
  return reason === 'missingTaxCode'
    ? 'enter the PAYE tax code from your payslip'
    : reason === 'unsupportedTaxCode'
      ? 'use a supported England, Wales, or Northern Ireland tax code, or rely on the annual estimate'
      : reason === 'contradictoryTaxCodeBasis'
        ? 'make the tax-code basis match the code shown on your payslip'
        : reason === 'invalidPayrollYearToDate'
          ? 'check completed periods and year-to-date pay and tax figures'
          : reason === 'bonusSacrificeNotAssignableToNextPeriod'
            ? 'reduce bonus sacrifice or include sufficient next-period additional pay'
            : 'check the supplied payroll details';
}

function payeAssumptionDescription(code: string): string {
  switch (code) {
    case 'periodPayDerivedFromAnnualSalary':
      return 'Period pay is derived from the annual base salary.';
    case 'regularSacrificeApportionedEvenly':
      return 'Regular salary sacrifice is apportioned evenly across pay periods.';
    case 'bonusSacrificeAppliedToNextPeriod':
      return 'Bonus salary sacrifice is applied to the next payroll period.';
    case 'taxBandsAndCodeAllowancesApportionedByFrequency':
      return 'Tax bands and tax-code allowances are apportioned by pay frequency.';
    case 'nationalInsuranceThresholdsAnnualised':
      return 'Employee National Insurance thresholds are calculated from annual configuration.';
    case 'kCodeDeductionCappedAtHalfPay':
      return 'The K-code Income Tax deduction is capped at half of this period’s pay.';
    case 'yearToDateUnavailable':
      return 'No year-to-date pay or tax figures were supplied for the cumulative estimate.';
    case 'yearToDateIgnoredForNonCumulativeBasis':
      return 'Year-to-date figures are not used for a Month 1 / Week 1 tax code.';
    case 'otherPayrollDeductionsNotModelled':
      return 'Other payroll deductions, such as student loans, are not modelled.';
    default:
      return 'The PAYE estimate includes a calculation assumption.';
  }
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
          payeBreakdown: {
            label: `PAYE-aware next ${paye.frequency} payslip breakdown`,
            grossPayPence: paye.nextPeriod.grossPay,
            pensionSalarySacrificePence: paye.nextPeriod.pensionSalarySacrifice,
            taxablePayPence: paye.nextPeriod.taxablePay,
            incomeTaxPence: paye.nextPeriod.incomeTax,
            employeeNationalInsurancePence:
              paye.nextPeriod.employeeNationalInsurance,
            netEmploymentPayPence: paye.nextPeriod.netEmploymentPay,
          },
          payeAssumptions: paye.assumptions.map((assumption) => ({
            code: assumption.code,
            description: payeAssumptionDescription(assumption.code),
          })),
        }
      : {}),
    ...(selectedScenario === 'current' && paye.kind === 'invalidOrUnsupported'
      ? {
          payeUnavailableReason: {
            title: 'PAYE-aware estimate is unavailable',
            description: `To enable it, ${payeUnavailableAction(paye)}. Annual planning results are still available.`,
          },
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
  const bonusIncome =
    current.traces.adjustedNetIncome.steps.find(
      (step) => step.code === 'bonusIncome',
    )?.amount ?? 0;
  const equityCertainty = certaintyForEquityIncome(
    state.plan.facts.equityIncome,
  );
  const baseReportInputs: readonly ReportInput[] = [
    {
      id: 'base-salary',
      label: 'Base salary',
      value: formatPounds(state.plan.facts.baseSalary),
    },
    {
      id: 'bonus',
      label: 'Expected bonus',
      value: formatPounds(bonusIncome),
      status: state.plan.facts.bonus.amountOverride?.certainty ?? 'forecast',
    },
    {
      id: 'equity-income',
      label: 'RSU and share income',
      value: formatPounds(
        state.plan.facts.equityIncome.reduce(
          (total, income) => total + income.amount,
          0,
        ),
      ),
      ...(equityCertainty === undefined ? {} : { status: equityCertainty }),
    },
    {
      id: 'taxable-benefits',
      label: 'Taxable benefits',
      value: formatPounds(state.plan.facts.taxableBenefits.amount),
      status: state.plan.facts.taxableBenefits.certainty,
    },
    {
      id: 'savings-interest',
      label: 'Savings interest',
      value: formatPounds(state.plan.facts.savingsInterest.amount),
      status: state.plan.facts.savingsInterest.certainty,
    },
    {
      id: 'other-taxable-income',
      label: 'Other taxable income',
      value: formatPounds(state.plan.facts.otherTaxableIncome),
    },
    {
      id: 'employer-pension-contribution',
      label: 'Employer pension contribution',
      value: formatPounds(state.plan.facts.employerPensionContribution),
    },
    {
      id: 'current-regular-salary-sacrifice',
      label: 'Current total regular salary sacrifice',
      value: formatPounds(state.plan.current.regularSalarySacrifice),
    },
    {
      id: 'current-bonus-salary-sacrifice',
      label: 'Current bonus salary sacrifice',
      value: formatPounds(state.plan.current.bonusSalarySacrifice),
    },
    {
      id: 'current-sipp-net-contribution',
      label: 'Current SIPP contribution paid',
      value: formatPounds(state.plan.current.sippNetContribution),
    },
    {
      id: 'current-gift-aid-cash-donation',
      label: 'Current Gift Aid donation',
      value: formatPounds(state.plan.current.giftAidCashDonation),
    },
    {
      id: 'alternative-regular-salary-sacrifice',
      label: 'Alternative total regular salary sacrifice',
      value: formatPounds(state.plan.alternative.regularSalarySacrifice),
    },
    {
      id: 'alternative-bonus-salary-sacrifice',
      label: 'Alternative bonus salary sacrifice',
      value: formatPounds(state.plan.alternative.bonusSalarySacrifice),
    },
    {
      id: 'alternative-sipp-net-contribution',
      label: 'Alternative SIPP contribution paid',
      value: formatPounds(state.plan.alternative.sippNetContribution),
    },
    {
      id: 'alternative-gift-aid-cash-donation',
      label: 'Alternative Gift Aid donation',
      value: formatPounds(state.plan.alternative.giftAidCashDonation),
    },
    {
      id: 'max-additional-regular-salary-sacrifice',
      label: 'Maximum additional regular salary sacrifice',
      value: formatPounds(state.plan.maxAdditionalRegularSalarySacrifice),
    },
    {
      id: 'target-ani',
      label: 'ANI target',
      value: formatPounds(state.plan.targetAni),
    },
    {
      id: 'statutory-childcare-ani-threshold',
      label: 'Statutory childcare ANI threshold',
      value: formatPounds(state.derived.config.childcareAniThreshold),
    },
  ];

  const payroll = state.plan.facts.payroll;
  const payrollReportInputs: readonly ReportInput[] =
    payroll === undefined
      ? []
      : [
          {
            id: 'payroll-tax-code',
            label: 'PAYE tax code',
            value: payroll.taxCode,
          },
          {
            id: 'payroll-tax-code-basis',
            label: 'PAYE tax-code basis',
            value: payroll.taxCodeBasis,
          },
          {
            id: 'payroll-pay-frequency',
            label: 'PAYE pay frequency',
            value: payroll.payFrequency,
          },
          ...(payroll.nextPeriodAdditionalGrossPay === undefined
            ? []
            : [
                {
                  id: 'payroll-next-period-additional-gross-pay',
                  label: 'Next-period bonus or additional pay',
                  value: formatPounds(payroll.nextPeriodAdditionalGrossPay),
                },
              ]),
          ...(payroll.yearToDate === undefined
            ? []
            : [
                {
                  id: 'payroll-year-to-date-periods',
                  label: 'Completed payroll periods',
                  value: String(payroll.yearToDate.completedPeriods),
                },
                {
                  id: 'payroll-year-to-date-taxable-pay',
                  label: 'Year-to-date taxable pay',
                  value: formatPounds(payroll.yearToDate.taxablePay),
                },
                {
                  id: 'payroll-year-to-date-income-tax-paid',
                  label: 'Year-to-date Income Tax paid',
                  value: formatPounds(payroll.yearToDate.incomeTaxPaid),
                },
              ]),
        ];
  const reportInputs = [...baseReportInputs, ...payrollReportInputs];

  return {
    taxYearLabel: state.plan.taxYear,
    taxConfigVersion: state.derived.config.version,
    inputs: reportInputs,
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      label: scenario.name,
      adjustedNetIncome: scenario.adjustedNetIncome,
      annualNetEmploymentPay: scenario.annualNetEmploymentPay ?? 'Not supplied',
      annualDisposableCash: scenario.annualDisposableCash,
      annualPensionInput: scenario.annualPensionInput,
      targetPosition: scenario.targetHeadroom,
    })),
    notices: issues.map((issue, index) => {
      const copy = messageCopy(issue, issueCopy);
      return {
        id: `${issue.code}-${index}`,
        severity: issue.severity,
        title: copy.title,
        body: copy.description,
      };
    }),
    insights: state.derived.insights.map((insight, index) => {
      const copy = messageCopy(insight, insightCopy);
      return {
        id: `${insight.code}-${index}`,
        severity: insight.severity,
        title: copy.title,
        body: copy.description,
      };
    }),
    assumptions: [
      'Annual estimate for one PAYE employment in England, Wales, or Northern Ireland.',
      state.derived.paye.kind === 'supported'
        ? 'PAYE-aware figures are estimates and are not payslip reconciliation.'
        : state.derived.paye.kind === 'invalidOrUnsupported'
          ? `PAYE-aware next-payslip figures are unavailable until you ${payeUnavailableAction(state.derived.paye)}.`
          : 'PAYE-aware next-payslip figures are unavailable until sufficient payroll details are supplied.',
      ...(state.derived.paye.kind === 'supported'
        ? state.derived.paye.assumptions.map((assumption) =>
            payeAssumptionDescription(assumption.code),
          )
        : []),
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
