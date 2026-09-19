import styles from './ProjectionChart.module.css';

export type ChartStatus = 'ready' | 'invalid' | 'unreachable';

export interface ChartMetricValues {
  /** Raw pence values used only to position independent relative plots. */
  readonly sacrificePence: number;
  readonly adjustedNetIncomePence: number;
  readonly annualNetEmploymentPayPence: number;
  readonly annualDisposableCashPence: number;
  readonly pensionInputPence: number;
}

export interface ChartMarker {
  readonly id:
    | 'current'
    | 'optimal'
    | 'alternative'
    | 'target'
    | 'statutoryThreshold'
    | 'personalAllowanceBreakpoint';
  readonly label: string;
  readonly description?: string;
}

export interface ChartPoint {
  readonly sacrifice: string;
  readonly adjustedNetIncome: string;
  readonly annualNetEmploymentPay?: string;
  readonly disposableCash: string;
  readonly pensionInput: string;
  readonly marker?: string;
  readonly values?: ChartMetricValues;
}

export interface ProjectionChartProps {
  readonly points: readonly ChartPoint[];
  readonly markers?: readonly ChartMarker[];
  readonly selectedIndex: number;
  readonly status?: ChartStatus;
  readonly statusMessage?: string;
  readonly onSelectedIndexChange?: (index: number) => void;
}

interface MetricPlotProps {
  readonly points: readonly ChartPoint[];
  readonly valueFor: (point: ChartMetricValues) => number;
  readonly label: string;
  readonly tone: 'ani' | 'employment' | 'cash' | 'pension';
}

const plotWidth = 240;
const plotHeight = 92;
const plotInset = 12;

function MetricPlot({ points, valueFor, label, tone }: MetricPlotProps) {
  const values = points.map((point) => valueFor(point.values!));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const availableWidth = plotWidth - plotInset * 2;
  const availableHeight = plotHeight - plotInset * 2;
  const sacrifices = points.map((point) => point.values!.sacrificePence);
  const minimumSacrifice = Math.min(...sacrifices);
  const sacrificeSpan = Math.max(
    Math.max(...sacrifices) - minimumSacrifice,
    1,
  );
  const xFor = (point: ChartPoint) =>
    plotInset +
    ((point.values!.sacrificePence - minimumSacrifice) / sacrificeSpan) *
      availableWidth;
  const path = points
    .map((point, index) => {
      const x = xFor(point);
      const y =
        plotInset +
        availableHeight -
        ((valueFor(point.values!) - low) / span) * availableHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className={styles.metricPlot}>
      <h3>{label}</h3>
      <svg aria-hidden="true" viewBox={`0 0 ${plotWidth} ${plotHeight}`}>
        <line
          className={styles.plotBaseline}
          x1={plotInset}
          x2={plotWidth - plotInset}
          y1={plotHeight - plotInset}
          y2={plotHeight - plotInset}
        />
        <path className={styles[`plot${tone}`]} d={path} fill="none" />
        {points.map((point, index) => {
          const x = xFor(point);
          const y =
            plotInset +
            availableHeight -
            ((valueFor(point.values!) - low) / span) * availableHeight;
          return (
            <circle
              className={styles[`plot${tone}`]}
              cx={x}
              cy={y}
              key={`${point.sacrifice}-${index}`}
              r="3.5"
            />
          );
        })}
      </svg>
      <p>Relative change across the selected samples</p>
    </div>
  );
}

function stateMessage(
  status: ChartStatus | undefined,
  statusMessage: string | undefined,
) {
  if (statusMessage) {
    return statusMessage;
  }

  if (status === 'invalid') {
    return 'Correct the plan inputs before a sacrifice curve can be shown.';
  }

  if (status === 'unreachable') {
    return 'The target cannot be reached within the selected sacrifice limit. Compare the available samples below.';
  }

  return undefined;
}

export function ProjectionChart({
  markers = [],
  onSelectedIndexChange,
  points,
  selectedIndex,
  status = 'ready',
  statusMessage,
}: ProjectionChartProps) {
  const clampedIndex = Math.min(
    Math.max(selectedIndex, 0),
    Math.max(points.length - 1, 0),
  );
  const selectedPoint = points.at(clampedIndex);
  const canDrawPlots =
    points.length > 1 && points.every((point) => point.values);
  const message = stateMessage(status, statusMessage);

  return (
    <section
      aria-labelledby="projection-chart-heading"
      className={styles.panel}
    >
      <header>
        <p className={styles.eyebrow}>Scenario curve</p>
        <h2 id="projection-chart-heading">Salary sacrifice trade-off</h2>
        <p id="chart-description">
          Each outcome has its own relative plot. ANI, net employment pay,
          disposable cash, and pension input are not plotted on a shared axis.
        </p>
      </header>

      {message ? (
        <p
          className={status === 'invalid' ? styles.error : styles.status}
          role={status === 'invalid' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}

      {points.length === 0 ? (
        <p className={styles.status} role="status">
          Add valid plan inputs to see sacrifice samples and compare an
          Alternative.
        </p>
      ) : (
        <>
          <label className={styles.selector}>
            Alternative sacrifice point
            <select
              aria-describedby="chart-description selected-point-summary"
              onChange={(event) =>
                onSelectedIndexChange?.(Number(event.currentTarget.value))
              }
              value={clampedIndex}
            >
              {points.map((point, index) => (
                <option key={`${point.sacrifice}-${index}`} value={index}>
                  {point.sacrifice}
                  {point.marker ? ` — ${point.marker}` : ''}
                </option>
              ))}
            </select>
          </label>

          {selectedPoint ? (
            <section
              aria-live="polite"
              className={styles.selectedSummary}
              id="selected-point-summary"
            >
              <h3>Selected Alternative: {selectedPoint.sacrifice}</h3>
              <dl>
                <div>
                  <dt>Adjusted net income</dt>
                  <dd>{selectedPoint.adjustedNetIncome}</dd>
                </div>
                <div>
                  <dt>Annual net employment pay</dt>
                  <dd>
                    {selectedPoint.annualNetEmploymentPay ?? 'Not supplied'}
                  </dd>
                </div>
                <div>
                  <dt>Annual disposable cash</dt>
                  <dd>{selectedPoint.disposableCash}</dd>
                </div>
                <div>
                  <dt>Annual pension input</dt>
                  <dd>{selectedPoint.pensionInput}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {canDrawPlots ? (
            <figure
              aria-describedby="chart-description"
              className={styles.figure}
            >
              <figcaption>
                Relative movement by outcome. Use the sample table for exact
                amounts and marker details.
              </figcaption>
              <div className={styles.plots}>
                <MetricPlot
                  label="Adjusted net income"
                  points={points}
                  tone="ani"
                  valueFor={(values) => values.adjustedNetIncomePence}
                />
                <MetricPlot
                  label="Annual net employment pay"
                  points={points}
                  tone="employment"
                  valueFor={(values) => values.annualNetEmploymentPayPence}
                />
                <MetricPlot
                  label="Annual disposable cash"
                  points={points}
                  tone="cash"
                  valueFor={(values) => values.annualDisposableCashPence}
                />
                <MetricPlot
                  label="Annual pension input"
                  points={points}
                  tone="pension"
                  valueFor={(values) => values.pensionInputPence}
                />
              </div>
            </figure>
          ) : (
            <p className={styles.status}>
              Relative plots are unavailable for these samples. Exact supplied
              values remain available in the table.
            </p>
          )}

          {markers.length > 0 ? (
            <aside aria-label="Curve markers" className={styles.markers}>
              <h3>Markers</h3>
              <ul>
                {markers.map((marker) => (
                  <li key={marker.id}>
                    <strong>{marker.label}</strong>
                    {marker.description ? `: ${marker.description}` : ''}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          <div className={styles.tableWrap}>
            <table>
              <caption>
                Exact projection samples across additional regular salary
                sacrifice
              </caption>
              <thead>
                <tr>
                  <th scope="col">Marker</th>
                  <th scope="col">Additional sacrifice</th>
                  <th scope="col">ANI</th>
                  <th scope="col">Net employment pay</th>
                  <th scope="col">Disposable cash</th>
                  <th scope="col">Pension input</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr
                    aria-current={index === selectedIndex ? 'true' : undefined}
                    key={`${point.sacrifice}-${index}`}
                  >
                    <td>{point.marker ?? '—'}</td>
                    <td>{point.sacrifice}</td>
                    <td>{point.adjustedNetIncome}</td>
                    <td>{point.annualNetEmploymentPay ?? 'Not supplied'}</td>
                    <td>{point.disposableCash}</td>
                    <td>{point.pensionInput}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
