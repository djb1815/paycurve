import styles from './ProjectionChart.module.css';

export type ChartStatus = 'ready' | 'invalid' | 'unreachable';

export interface ChartMetricValues {
  readonly sacrificePence: number;
  readonly grossEmploymentPayPence?: number;
  readonly adjustedNetIncomePence: number;
  readonly annualNetEmploymentPayPence: number;
  readonly annualDisposableCashPence: number;
  readonly pensionInputPence: number;
}

export interface ChartMarker {
  readonly id: 'current' | 'optimal' | 'alternative' | 'target' | 'statutoryThreshold' | 'personalAllowanceBreakpoint';
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

const width = 760;
const height = 350;
const inset = { left: 68, right: 24, top: 20, bottom: 54 };
const series = [
  { key: 'grossEmploymentPayPence', label: 'Gross employment pay', tone: 'gross' },
  { key: 'adjustedNetIncomePence', label: 'Adjusted net income', tone: 'ani' },
  { key: 'annualNetEmploymentPayPence', label: 'Net employment pay', tone: 'employment' },
  { key: 'annualDisposableCashPence', label: 'Disposable cash', tone: 'cash' },
  { key: 'pensionInputPence', label: 'Pension input', tone: 'pension' },
] as const;

const moneyTick = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact', maximumFractionDigits: 1 }).format(pence / 100);

function statusText(status: ChartStatus, message?: string) {
  if (message) return message;
  if (status === 'invalid') return 'Correct the plan inputs before a sacrifice curve can be shown.';
  if (status === 'unreachable') return 'The target cannot be reached within the selected sacrifice limit.';
  return undefined;
}

export function ProjectionChart({ markers = [], onSelectedIndexChange, points, selectedIndex, status = 'ready', statusMessage }: ProjectionChartProps) {
  const selected = Math.max(0, Math.min(selectedIndex, Math.max(0, points.length - 1)));
  const drawable = points.length > 1 && points.every((point) => point.values);
  const message = statusText(status, statusMessage);
  const metricValues = drawable ? points.flatMap((point) => series.map((item) => point.values?.[item.key]).filter((value): value is number => value !== undefined)) : [];
  const sacrifices = drawable ? points.map((point) => point.values!.sacrificePence) : [];
  const low = metricValues.length ? Math.min(0, ...metricValues) : 0;
  const high = metricValues.length ? Math.max(...metricValues) : 1;
  const maxSacrifice = Math.max(...sacrifices, 1);
  const graphWidth = width - inset.left - inset.right;
  const graphHeight = height - inset.top - inset.bottom;
  const xFor = (value: number) => inset.left + (value / maxSacrifice) * graphWidth;
  const yFor = (value: number) => inset.top + graphHeight - ((value - low) / (high - low || 1)) * graphHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => low + ((high - low) * index) / 4);

  return <section aria-labelledby="projection-chart-heading" className={styles.panel}>
    <header><p className={styles.eyebrow}>Scenario curve</p><h2 id="projection-chart-heading">Salary sacrifice trade-off</h2><p id="chart-description">Annual outcomes share one £ axis. Lines show the available sacrifice range; only Current, Optimal, and Alternative are marked.</p></header>
    {message ? <p className={status === 'invalid' ? styles.error : styles.status} role={status === 'invalid' ? 'alert' : 'status'}>{message}</p> : null}
    {!drawable ? <p className={styles.status} role="status">Add valid plan inputs to see the salary-sacrifice trade-off.</p> : <>
      <figure aria-describedby="chart-description" className={styles.figure}>
        <svg aria-label="Salary sacrifice trade-off chart" role="img" viewBox={`0 0 ${width} ${height}`}>
          {ticks.map((tick) => <g key={tick}><line className={styles.grid} x1={inset.left} x2={width - inset.right} y1={yFor(tick)} y2={yFor(tick)} /><text className={styles.axisText} textAnchor="end" x={inset.left - 8} y={yFor(tick) + 4}>{moneyTick(tick)}</text></g>)}
          <line className={styles.axis} x1={inset.left} x2={width - inset.right} y1={height - inset.bottom} y2={height - inset.bottom} />
          {[0, maxSacrifice / 2, maxSacrifice].map((tick) => <text className={styles.axisText} key={tick} textAnchor="middle" x={xFor(tick)} y={height - 24}>{moneyTick(tick)}</text>)}
          <text className={styles.axisLabel} textAnchor="middle" x={width / 2} y={height - 4}>Additional annual salary sacrifice</text>
          {series.map((item) => <path className={styles[`line${item.tone}`]} d={points.map((point, index) => { const value = point.values?.[item.key]; return value === undefined ? '' : `${index === 0 ? 'M' : 'L'} ${xFor(point.values!.sacrificePence)} ${yFor(value)}`; }).join(' ')} fill="none" key={item.key} />)}
          {points.map((point, index) => point.marker ? <g key={`${point.sacrifice}-${index}`}><circle className={styles.marker} cx={xFor(point.values!.sacrificePence)} cy={height - inset.bottom} r="5" /><text className={styles.markerLabel} textAnchor="middle" x={xFor(point.values!.sacrificePence)} y={height - inset.bottom - 10}>{point.marker}</text></g> : null)}
        </svg>
        <figcaption><span className={styles.legend}>{series.map((item) => <span className={styles[`legend${item.tone}`]} key={item.key}>{item.label}</span>)}</span>Exact values are available in the table below.</figcaption>
      </figure>
      <label className={styles.slider}>Alternative regular sacrifice <input aria-describedby="chart-description selected-point-summary" max={points.length - 1} min="0" onChange={(event) => onSelectedIndexChange?.(Number(event.currentTarget.value))} step="1" type="range" value={selected} /></label>
      {points[selected] ? <p aria-live="polite" className={styles.selectedSummary} id="selected-point-summary"><strong>Alternative: {points[selected].sacrifice}</strong> · ANI {points[selected].adjustedNetIncome} · Net pay {points[selected].annualNetEmploymentPay ?? 'Not supplied'} · Pension {points[selected].pensionInput}</p> : null}
    </>}
    {markers.length ? <aside aria-label="Curve markers" className={styles.markers}>{markers.map((marker) => <span key={marker.id}><strong>{marker.label}</strong>{marker.description ? `: ${marker.description}` : ''}</span>)}</aside> : null}
    {points.length ? <details className={styles.tableDisclosure}><summary><span>Exact projection samples</span><span className={styles.tableDisclosureHint}>Show table</span></summary><div className={styles.tableWrap}><table><caption>Exact projection samples across additional regular salary sacrifice</caption><thead><tr><th>Marker</th><th>Additional sacrifice</th><th>ANI</th><th>Net employment pay</th><th>Disposable cash</th><th>Pension input</th></tr></thead><tbody>{points.map((point, index) => <tr aria-current={index === selected ? 'true' : undefined} key={`${point.sacrifice}-${index}`}><td>{point.marker ?? '—'}</td><td>{point.sacrifice}</td><td>{point.adjustedNetIncome}</td><td>{point.annualNetEmploymentPay ?? 'Not supplied'}</td><td>{point.disposableCash}</td><td>{point.pensionInput}</td></tr>)}</tbody></table></div></details> : null}
  </section>;
}
