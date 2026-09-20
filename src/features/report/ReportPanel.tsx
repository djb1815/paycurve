import styles from './ReportPanel.module.css';

export interface ReportSection {
  readonly id: string;
  readonly heading: string;
  readonly body: string;
}

export interface ReportInput {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  /** Identifies whether a supplied amount is a forecast or recorded value. */
  readonly status?: 'actual' | 'forecast' | 'mixed';
}

export interface ReportScenario {
  readonly id: string;
  readonly label: string;
  readonly adjustedNetIncome: string;
  readonly annualNetEmploymentPay: string;
  readonly annualDisposableCash: string;
  readonly annualPensionInput: string;
  readonly targetPosition?: string;
}

export interface ReportNotice {
  readonly id: string;
  readonly severity: 'error' | 'warning' | 'information';
  readonly title: string;
  readonly body: string;
}

export interface ReportInsight {
  readonly id: string;
  readonly severity: 'information' | 'positive' | 'warning';
  readonly title: string;
  readonly body: string;
}

export interface ReportTraceLine {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface ReportTrace {
  readonly id: string;
  readonly title: string;
  readonly total: string;
  readonly lines: readonly ReportTraceLine[];
}

/** A text/table alternative to the interactive curve for print and assistive technology. */
export interface ReportChartAlternative {
  readonly caption: string;
  readonly rows: readonly {
    readonly id: string;
    readonly label: string;
    readonly sacrifice: string;
    readonly adjustedNetIncome: string;
    readonly netEmploymentPay: string;
    readonly disposableCash: string;
  }[];
}

/**
 * Preformatted report data. This component deliberately does not derive, round,
 * or reinterpret financial values: calculation and presentation adapters supply
 * the exact display strings.
 */
export interface PlanningReport {
  readonly taxYearLabel: string;
  readonly taxConfigVersion: string;
  readonly inputs: readonly ReportInput[];
  readonly scenarios: readonly ReportScenario[];
  readonly notices?: readonly ReportNotice[];
  readonly insights?: readonly ReportInsight[];
  readonly assumptions?: readonly string[];
  readonly traces?: readonly ReportTrace[];
  readonly chartAlternative?: ReportChartAlternative;
}

export interface ReportPanelProps {
  readonly generatedLabel: string;
  /** Legacy fixture-friendly freeform sections. Use `report` for the full report. */
  readonly sections: readonly ReportSection[];
  readonly report?: PlanningReport;
  readonly onPrint?: () => void;
}

function statusLabel(status: ReportInput['status']) {
  if (status === 'actual') return 'Actual';
  if (status === 'forecast') return 'Forecast';
  if (status === 'mixed') return 'Forecast and actual';
  return null;
}

function reportContent(report: PlanningReport) {
  return (
    <>
      <dl className={styles.identity}>
        <div>
          <dt>Tax year</dt>
          <dd>{report.taxYearLabel}</dd>
        </div>
        <div>
          <dt>Tax configuration</dt>
          <dd>{report.taxConfigVersion}</dd>
        </div>
      </dl>

      <section aria-labelledby="report-inputs-heading">
        <h3 id="report-inputs-heading">Supplied inputs</h3>
        <dl className={styles.inputs}>
          {report.inputs.map((input) => {
            const status = statusLabel(input.status);
            return (
              <div key={input.id}>
                <dt>{input.label}</dt>
                <dd>
                  {input.value}
                  {status ? (
                    <span className={styles.status}> · {status}</span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section aria-labelledby="report-scenarios-heading">
        <h3 id="report-scenarios-heading">Scenario comparison</h3>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                <th scope="col">Adjusted net income</th>
                <th scope="col">Annual net employment pay</th>
                <th scope="col">Annual disposable cash</th>
                <th scope="col">Annual pension input</th>
                <th scope="col">Target position</th>
              </tr>
            </thead>
            <tbody>
              {report.scenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <th scope="row">{scenario.label}</th>
                  <td>{scenario.adjustedNetIncome}</td>
                  <td>{scenario.annualNetEmploymentPay}</td>
                  <td>{scenario.annualDisposableCash}</td>
                  <td>{scenario.annualPensionInput}</td>
                  <td>{scenario.targetPosition ?? 'Not supplied'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {report.notices?.length ? (
        <section aria-labelledby="report-notices-heading">
          <h3 id="report-notices-heading">Warnings and checks</h3>
          <ul className={styles.notices}>
            {report.notices.map((notice) => (
              <li className={styles[notice.severity]} key={notice.id}>
                <strong>
                  {notice.severity.toUpperCase()}: {notice.title}
                </strong>{' '}
                {notice.body}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.insights?.length ? (
        <section aria-labelledby="report-insights-heading">
          <h3 id="report-insights-heading">Planning insights</h3>
          <ul className={styles.notices}>
            {report.insights.map((insight) => (
              <li className={styles[insight.severity]} key={insight.id}>
                <strong>
                  {insight.severity === 'positive'
                    ? 'INSIGHT'
                    : insight.severity.toUpperCase()}
                  : {insight.title}
                </strong>{' '}
                {insight.body}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.assumptions?.length ? (
        <section aria-labelledby="report-assumptions-heading">
          <h3 id="report-assumptions-heading">Assumptions and limitations</h3>
          <ul className={styles.list}>
            {report.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.traces?.length ? (
        <section aria-labelledby="report-traces-heading">
          <h3 id="report-traces-heading">Calculation traces</h3>
          <div className={styles.traces}>
            {report.traces.map((trace) => (
              <article key={trace.id}>
                <h4>{trace.title}</h4>
                <dl>
                  {trace.lines.map((line) => (
                    <div key={line.id}>
                      <dt>{line.label}</dt>
                      <dd>{line.value}</dd>
                    </div>
                  ))}
                  <div className={styles.traceTotal}>
                    <dt>Total</dt>
                    <dd>{trace.total}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {report.chartAlternative ? (
        <section aria-labelledby="report-chart-heading">
          <h3 id="report-chart-heading">Sacrifice trade-off table</h3>
          <p>{report.chartAlternative.caption}</p>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Point</th>
                  <th scope="col">Additional regular sacrifice</th>
                  <th scope="col">Adjusted net income</th>
                  <th scope="col">Net employment pay</th>
                  <th scope="col">Disposable cash</th>
                </tr>
              </thead>
              <tbody>
                {report.chartAlternative.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.label}</th>
                    <td>{row.sacrifice}</td>
                    <td>{row.adjustedNetIncome}</td>
                    <td>{row.netEmploymentPay}</td>
                    <td>{row.disposableCash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}

export function ReportPanel({
  generatedLabel,
  sections,
  report,
  onPrint,
}: ReportPanelProps) {
  return (
    <section aria-labelledby="report-heading" className={styles.panel}>
      <header>
        <div>
          <p className={styles.eyebrow}>Planning record</p>
          <h2 id="report-heading">Scenario report</h2>
        </div>
        <button className={styles.printControl} onClick={onPrint} type="button">
          Print report
        </button>
      </header>
      <p className={styles.generated}>Prepared {generatedLabel}.</p>
      {report ? reportContent(report) : null}
      {!report
        ? sections.map((section) => (
            <article className={styles.legacySection} key={section.id}>
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </article>
          ))
        : null}
    </section>
  );
}
