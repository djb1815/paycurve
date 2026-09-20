import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from './ProjectionChart.module.css';

export type ChartStatus = 'ready' | 'invalid' | 'unreachable';

export interface ChartMetricValues {
  readonly sacrificePence: number;
  readonly grossEmploymentPayPence?: number;
  readonly adjustedNetIncomePence: number;
  readonly annualNetEmploymentPayPence: number;
  readonly annualDisposableCashPence: number;
  readonly pensionInputPence: number;
  readonly incomeTaxPence: number;
  readonly employeeNationalInsurancePence: number;
  readonly salarySacrificePence: number;
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
  readonly targetAniPence?: number;
}

const moneyTick = (pence: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(pence / 100);
const money = (pence: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(pence / 100);

function statusText(status: ChartStatus, message?: string) {
  if (message) return message;
  if (status === 'invalid')
    return 'Correct the plan inputs before a sacrifice curve can be shown.';
  if (status === 'unreachable')
    return 'The target cannot be reached within the selected sacrifice limit.';
  return undefined;
}

function BreakdownTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: readonly {
    readonly payload: ChartPoint & { readonly index: number };
  }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point?.values) return null;
  const values = point.values;
  return (
    <div className={styles.tooltip}>
      <strong>
        {point.marker ?? 'Selected sacrifice'}: {point.sacrifice}
      </strong>
      <dl>
        <div>
          <dt>Net employment pay</dt>
          <dd>{money(values.annualNetEmploymentPayPence)}</dd>
        </div>
        <div>
          <dt>Income Tax</dt>
          <dd>{money(values.incomeTaxPence)}</dd>
        </div>
        <div>
          <dt>Employee NI</dt>
          <dd>{money(values.employeeNationalInsurancePence)}</dd>
        </div>
        <div>
          <dt>Salary sacrifice</dt>
          <dd>{money(values.salarySacrificePence)}</dd>
        </div>
        <div>
          <dt>Gross employment income</dt>
          <dd>{money(values.grossEmploymentPayPence ?? 0)}</dd>
        </div>
        <div>
          <dt>ANI</dt>
          <dd>{money(values.adjustedNetIncomePence)}</dd>
        </div>
        <div>
          <dt>Pension input</dt>
          <dd>{money(values.pensionInputPence)}</dd>
        </div>
        <div>
          <dt>Disposable cash</dt>
          <dd>{money(values.annualDisposableCashPence)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ProjectionChart({
  markers = [],
  onSelectedIndexChange,
  points,
  selectedIndex,
  status = 'ready',
  statusMessage,
  targetAniPence,
}: ProjectionChartProps) {
  const selected = Math.max(
    0,
    Math.min(selectedIndex, Math.max(0, points.length - 1)),
  );
  const drawable = points.length > 1 && points.every((point) => point.values);
  const message = statusText(status, statusMessage);
  const chartData = points.map((point, index) => ({
    ...point.values!,
    index,
    label: point.sacrifice,
    marker: point.marker,
  }));

  return (
    <section
      aria-labelledby="projection-chart-heading"
      className={styles.panel}
    >
      <header>
        <p className={styles.eyebrow}>Scenario curve</p>
        <h2 id="projection-chart-heading">Where employment pay goes</h2>
        <p id="chart-description">
          Coloured areas show the employment-pay allocation at each sacrifice
          level. ANI is shown as a line because it is a tax measure, not a part
          of pay. Hover or select a point for exact values.
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
      {!drawable ? (
        <p className={styles.status} role="status">
          Add valid plan inputs to see the salary-sacrifice trade-off.
        </p>
      ) : (
        <>
          <figure
            aria-describedby="chart-description"
            className={styles.figure}
          >
            <div
              aria-label="Interactive employment-pay allocation chart"
              className={styles.chart}
            >
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 16, right: 24, bottom: 8, left: 12 }}
                  onClick={(event) => {
                    const index = event?.activeTooltipIndex;
                    if (typeof index === 'number')
                      onSelectedIndexChange?.(index);
                  }}
                >
                  <CartesianGrid
                    stroke="var(--colour-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="sacrificePence"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={moneyTick}
                    tickLine={false}
                    type="number"
                  />
                  <YAxis
                    tickFormatter={moneyTick}
                    tickLine={false}
                    width={62}
                  />
                  <Tooltip
                    content={<BreakdownTooltip />}
                    cursor={{
                      stroke: 'var(--colour-text-muted)',
                      strokeWidth: 1,
                    }}
                  />
                  <Legend />
                  <Area
                    dataKey="annualNetEmploymentPayPence"
                    fill="var(--chart-employment)"
                    fillOpacity={0.78}
                    name="Net employment pay"
                    stackId="pay"
                    stroke="var(--chart-employment)"
                    type="monotone"
                  />
                  <Area
                    dataKey="incomeTaxPence"
                    fill="var(--colour-danger)"
                    fillOpacity={0.72}
                    name="Income Tax"
                    stackId="pay"
                    stroke="var(--colour-danger)"
                    type="monotone"
                  />
                  <Area
                    dataKey="employeeNationalInsurancePence"
                    fill="var(--chart-cash)"
                    fillOpacity={0.72}
                    name="Employee NI"
                    stackId="pay"
                    stroke="var(--chart-cash)"
                    type="monotone"
                  />
                  <Area
                    dataKey="salarySacrificePence"
                    fill="var(--chart-pension)"
                    fillOpacity={0.78}
                    name="Salary sacrifice"
                    stackId="pay"
                    stroke="var(--chart-pension)"
                    type="monotone"
                  />
                  <Line
                    dataKey="adjustedNetIncomePence"
                    dot={false}
                    name="Adjusted net income"
                    stroke="var(--chart-ani)"
                    strokeWidth={3}
                    type="monotone"
                  />
                  {targetAniPence !== undefined ? (
                    <ReferenceLine
                      label="ANI target"
                      stroke="var(--colour-warning)"
                      strokeDasharray="6 4"
                      y={targetAniPence}
                    />
                  ) : null}
                  {chartData.map((point) =>
                    point.marker ? (
                      <ReferenceLine
                        key={`${point.marker}-${point.index}`}
                        label={point.marker}
                        stroke="var(--colour-text)"
                        strokeDasharray="2 4"
                        x={point.sacrificePence}
                      />
                    ) : null,
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <figcaption>
              Click a point, or use the slider below, to set Alternative. Exact
              values are available in the table below. If you include other
              taxable income, Income Tax is the total annual tax result, so the
              stack is an outcome breakdown rather than a gross-pay
              reconciliation.
            </figcaption>
          </figure>
          <label className={styles.slider}>
            Alternative regular sacrifice{' '}
            <input
              aria-describedby="chart-description selected-point-summary"
              max={points.length - 1}
              min="0"
              onChange={(event) =>
                onSelectedIndexChange?.(Number(event.currentTarget.value))
              }
              step="1"
              type="range"
              value={selected}
            />
          </label>
          {points[selected] ? (
            <p
              aria-live="polite"
              className={styles.selectedSummary}
              id="selected-point-summary"
            >
              <strong>Alternative: {points[selected].sacrifice}</strong> · ANI{' '}
              {points[selected].adjustedNetIncome} · Net pay{' '}
              {points[selected].annualNetEmploymentPay ?? 'Not supplied'} ·
              Pension {points[selected].pensionInput}
            </p>
          ) : null}
        </>
      )}
      {markers.length ? (
        <aside aria-label="Curve markers" className={styles.markers}>
          {markers.map((marker) => (
            <span key={marker.id}>
              <strong>{marker.label}</strong>
              {marker.description ? `: ${marker.description}` : ''}
            </span>
          ))}
        </aside>
      ) : null}
      {points.length ? (
        <details className={styles.tableDisclosure}>
          <summary>
            <span>Exact projection samples</span>
            <span className={styles.tableDisclosureHint}>Show table</span>
          </summary>
          <div className={styles.tableWrap}>
            <table>
              <caption>
                Exact projection samples across additional regular salary
                sacrifice
              </caption>
              <thead>
                <tr>
                  <th>Marker</th>
                  <th>Additional sacrifice</th>
                  <th>ANI</th>
                  <th>Net employment pay</th>
                  <th>Disposable cash</th>
                  <th>Pension input</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr
                    aria-current={index === selected ? 'true' : undefined}
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
        </details>
      ) : null}
    </section>
  );
}
