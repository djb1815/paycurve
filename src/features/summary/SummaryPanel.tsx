import styles from './SummaryPanel.module.css';
import {
  insightCopy,
  issueCopy,
  messageCopy,
  type SummaryInsightSeverity,
  type SummaryIssueSeverity,
} from './copy';
import {
  formatAbsolutePounds,
  formatDeltaPounds,
  formatPounds,
} from './format';

export interface SummaryMetric {
  id: string;
  label: string;
  formattedValue: string;
  detail?: string;
  emphasis?: 'default' | 'positive' | 'warning';
}

export interface SummaryIssue {
  readonly code: string;
  readonly severity: SummaryIssueSeverity;
  readonly parameters?: Readonly<Record<string, number>>;
}

export interface SummaryInsight {
  readonly code: string;
  readonly severity: SummaryInsightSeverity;
  readonly parameters?: Readonly<Record<string, number>>;
}

export interface ScenarioDelta {
  readonly id: string;
  readonly label: string;
  readonly adjustedNetIncomePence?: number;
  readonly annualNetEmploymentPayPence?: number;
  readonly annualDisposableCashPence?: number;
}

export interface PayeBreakdown {
  readonly label: string;
  readonly grossPayPence: number;
  readonly pensionSalarySacrificePence: number;
  readonly taxablePayPence: number;
  readonly incomeTaxPence: number;
  readonly employeeNationalInsurancePence: number;
  readonly netEmploymentPayPence: number;
}

export interface PayeAssumption {
  readonly code: string;
  readonly description: string;
}

export interface PayeUnavailableReason {
  readonly title: string;
  readonly description: string;
}

export interface SummaryOutcome {
  readonly scenarioLabel: string;
  /** Describes whether the supplied inputs contain forecasts, actuals, or both. */
  readonly incomeStatus?: 'actual' | 'forecast' | 'mixed';
  readonly adjustedNetIncomePence: number;
  /** Positive means below target; negative means above it. */
  readonly targetHeadroomPence: number;
  readonly annualNetEmploymentPayPence: number;
  readonly annualDisposableCashPence: number;
  readonly averagePeriodNetEmploymentPayPence: number;
  readonly averagePeriodDisposableCashPence: number;
  readonly averagePeriodLabel: string;
  readonly payeAwareNetEmploymentPayPence?: number;
  /** Such as "monthly" or "next payslip"; keeps the PAYE measure precise. */
  readonly payeAwarePeriodLabel?: string;
  /** Temporary integration override when the source provides a complete label. */
  readonly payeAwareLabel?: string;
  /** A next-payslip breakdown when optional payroll inputs support it. */
  readonly payeBreakdown?: PayeBreakdown;
  /** Structured caveats returned by the PAYE projection adapter. */
  readonly payeAssumptions?: readonly PayeAssumption[];
  /** A specific action when the optional PAYE estimate cannot be produced. */
  readonly payeUnavailableReason?: PayeUnavailableReason;
  readonly issues?: readonly SummaryIssue[];
  readonly insights?: readonly SummaryInsight[];
  readonly deltas?: readonly ScenarioDelta[];
}

export interface SummaryPanelProps {
  title?: string;
  /** Legacy fixture-friendly metrics; use `outcome` for a live projection. */
  metrics?: readonly SummaryMetric[];
  outcome?: SummaryOutcome;
  statusMessage?: string;
}

function outcomeMetrics(outcome: SummaryOutcome): readonly SummaryMetric[] {
  const headroomPositive = outcome.targetHeadroomPence >= 0;
  const periodLabel = outcome.averagePeriodLabel.trim() || 'period';
  const metrics: SummaryMetric[] = [
    {
      detail: `${outcome.scenarioLabel} scenario${outcome.incomeStatus ? ` · ${outcome.incomeStatus} inputs` : ''}`,
      formattedValue: formatPounds(outcome.adjustedNetIncomePence),
      id: 'adjusted-net-income',
      label: 'Adjusted net income',
    },
    {
      detail: headroomPositive
        ? 'Below selected target'
        : 'Above selected target',
      emphasis: headroomPositive ? 'positive' : 'warning',
      formattedValue: formatAbsolutePounds(outcome.targetHeadroomPence),
      id: 'target-headroom',
      label: headroomPositive ? 'Target headroom' : 'Amount above target',
    },
    {
      detail: 'After salary sacrifice, Income Tax, and employee NI',
      formattedValue: formatPounds(outcome.annualNetEmploymentPayPence),
      id: 'annual-net-employment-pay',
      label: 'Annual net employment pay',
    },
    {
      detail: 'After net SIPP payments and Gift Aid cash donations',
      formattedValue: formatPounds(outcome.annualDisposableCashPence),
      id: 'annual-disposable-cash',
      label: 'Annual disposable cash',
    },
    {
      detail: `Estimated average ${periodLabel}; not a payslip projection`,
      formattedValue: formatPounds(outcome.averagePeriodNetEmploymentPayPence),
      id: 'average-period-net-employment-pay',
      label: `Average ${periodLabel} net employment pay`,
    },
    {
      detail: `Estimated average ${periodLabel}; after SIPP and Gift Aid cash`,
      formattedValue: formatPounds(outcome.averagePeriodDisposableCashPence),
      id: 'average-period-disposable-cash',
      label: `Average ${periodLabel} disposable cash`,
    },
  ];

  if (outcome.payeAwareNetEmploymentPayPence !== undefined) {
    metrics.push({
      detail: 'PAYE-aware estimate; not payslip reconciliation',
      formattedValue: formatPounds(outcome.payeAwareNetEmploymentPayPence),
      id: 'paye-aware-net-employment-pay',
      label:
        outcome.payeAwareLabel ??
        `PAYE-aware ${outcome.payeAwarePeriodLabel ?? 'period'} net employment pay`,
    });
  }

  return metrics;
}

function severityLabel(
  severity: SummaryIssueSeverity | SummaryInsightSeverity,
) {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  if (severity === 'positive') return 'Positive insight';
  return 'Information';
}

export function SummaryPanel({
  title = 'Plan summary',
  metrics = [],
  outcome,
  statusMessage,
}: SummaryPanelProps) {
  const displayedMetrics = outcome ? outcomeMetrics(outcome) : metrics;

  return (
    <section aria-labelledby="plan-summary-heading" className={styles.panel}>
      <div className={styles.heading}>
        <h2 id="plan-summary-heading">{title}</h2>
        {statusMessage ? <p role="status">{statusMessage}</p> : null}
      </div>
      <dl className={styles.metrics}>
        {displayedMetrics.map((metric) => (
          <div className={styles[metric.emphasis ?? 'default']} key={metric.id}>
            <dt>{metric.label}</dt>
            <dd>{metric.formattedValue}</dd>
            {metric.detail ? (
              <dd className={styles.detail}>{metric.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
      {outcome?.deltas?.length ? (
        <section
          aria-labelledby="scenario-deltas-heading"
          className={styles.deltas}
        >
          <h3 id="scenario-deltas-heading">Change from Current</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                <th scope="col">ANI</th>
                <th scope="col">Net employment pay</th>
                <th scope="col">Disposable cash</th>
              </tr>
            </thead>
            <tbody>
              {outcome.deltas.map((delta) => (
                <tr key={delta.id}>
                  <th scope="row">{delta.label}</th>
                  <td>
                    {delta.adjustedNetIncomePence === undefined
                      ? 'Not supplied'
                      : formatDeltaPounds(delta.adjustedNetIncomePence)}
                  </td>
                  <td>
                    {delta.annualNetEmploymentPayPence === undefined
                      ? 'Not supplied'
                      : formatDeltaPounds(delta.annualNetEmploymentPayPence)}
                  </td>
                  <td>
                    {delta.annualDisposableCashPence === undefined
                      ? 'Not supplied'
                      : formatDeltaPounds(delta.annualDisposableCashPence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {outcome?.payeBreakdown ? (
        <section
          aria-labelledby="paye-breakdown-heading"
          className={styles.deltas}
        >
          <h3 id="paye-breakdown-heading">{outcome.payeBreakdown.label}</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Gross pay</th>
                <th scope="col">Salary sacrifice</th>
                <th scope="col">Taxable pay</th>
                <th scope="col">Income Tax</th>
                <th scope="col">Employee NI</th>
                <th scope="col">Net employment pay</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatPounds(outcome.payeBreakdown.grossPayPence)}</td>
                <td>
                  {formatPounds(
                    outcome.payeBreakdown.pensionSalarySacrificePence,
                  )}
                </td>
                <td>{formatPounds(outcome.payeBreakdown.taxablePayPence)}</td>
                <td>{formatPounds(outcome.payeBreakdown.incomeTaxPence)}</td>
                <td>
                  {formatPounds(
                    outcome.payeBreakdown.employeeNationalInsurancePence,
                  )}
                </td>
                <td>
                  {formatPounds(outcome.payeBreakdown.netEmploymentPayPence)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}
      {outcome?.payeAssumptions?.length ? (
        <section
          aria-labelledby="paye-assumptions-heading"
          className={styles.messages}
        >
          <h3 id="paye-assumptions-heading">PAYE assumptions</h3>
          <ul>
            {outcome.payeAssumptions.map((assumption) => (
              <li key={assumption.code}>{assumption.description}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {outcome?.payeUnavailableReason ? (
        <section
          aria-labelledby="paye-unavailable-heading"
          className={styles.messages}
        >
          <h3 id="paye-unavailable-heading">
            {outcome.payeUnavailableReason.title}
          </h3>
          <p>{outcome.payeUnavailableReason.description}</p>
        </section>
      ) : null}
      {outcome?.issues?.length ? (
        <section
          aria-labelledby="plan-issues-heading"
          className={styles.messages}
        >
          <details className={styles.disclosure}>
            <summary>
              <span id="plan-issues-heading" role="heading" aria-level={3}>
                Plan notices
              </span>
              <span className={styles.disclosureHint}>Show notices</span>
            </summary>
            <ul>
              {outcome.issues.map((issue, index) => {
                const copy = messageCopy(issue, issueCopy);
                return (
                  <li
                    className={styles[`message${issue.severity}`]}
                    key={`${issue.code}-${index}`}
                  >
                    <span className={styles.severity}>
                      {severityLabel(issue.severity)}:
                    </span>{' '}
                    <strong>{copy.title}</strong> {copy.description}
                  </li>
                );
              })}
            </ul>
          </details>
        </section>
      ) : null}
      {outcome?.insights?.length ? (
        <section
          aria-labelledby="plan-insights-heading"
          className={styles.messages}
        >
          <details className={styles.disclosure}>
            <summary>
              <span id="plan-insights-heading" role="heading" aria-level={3}>
                Planning insights
              </span>
              <span className={styles.disclosureHint}>Show insights</span>
            </summary>
            <ul>
              {outcome.insights.map((insight, index) => {
                const copy = messageCopy(insight, insightCopy);
                return (
                  <li
                    className={styles[`message${insight.severity}`]}
                    key={`${insight.code}-${index}`}
                  >
                    <span className={styles.severity}>
                      {severityLabel(insight.severity)}:
                    </span>{' '}
                    <strong>{copy.title}</strong> {copy.description}
                  </li>
                );
              })}
            </ul>
          </details>
        </section>
      ) : null}
    </section>
  );
}
