import styles from './ProjectionChart.module.css';

export interface ChartPoint {
  sacrifice: string;
  adjustedNetIncome: string;
  disposableCash: string;
  pensionInput: string;
  marker?: string;
}

export interface ProjectionChartProps {
  points: readonly ChartPoint[];
  selectedIndex: number;
  onSelectedIndexChange?: (index: number) => void;
}

export function ProjectionChart({
  points,
  selectedIndex,
  onSelectedIndexChange,
}: ProjectionChartProps) {
  const maximumIndex = Math.max(points.length - 1, 0);
  return (
    <section
      aria-labelledby="projection-chart-heading"
      className={styles.panel}
    >
      <header>
        <p className={styles.eyebrow}>Interactive preview</p>
        <h2 id="projection-chart-heading">Salary sacrifice trade-off</h2>
        <p id="chart-description">
          Select a sample to compare ANI, cash, and pension input. A graphical
          curve will be added with the calculation engine.
        </p>
      </header>
      <label className={styles.selector}>
        Selected sacrifice point
        <input
          aria-describedby="chart-description"
          disabled={points.length < 2}
          max={maximumIndex}
          min="0"
          onChange={(event) =>
            onSelectedIndexChange?.(Number(event.currentTarget.value))
          }
          step="1"
          type="range"
          value={Math.min(selectedIndex, maximumIndex)}
        />
      </label>
      <div className={styles.tableWrap} tabIndex={0}>
        <table>
          <caption>
            Projection samples across additional regular salary sacrifice
          </caption>
          <thead>
            <tr>
              <th scope="col">Marker</th>
              <th scope="col">Additional sacrifice</th>
              <th scope="col">ANI</th>
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
                <td>{point.disposableCash}</td>
                <td>{point.pensionInput}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
