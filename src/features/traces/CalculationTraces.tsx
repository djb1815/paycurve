import styles from './CalculationTraces.module.css';

export interface TraceLine {
  id: string;
  label: string;
  formattedAmount: string;
  operation?: 'add' | 'subtract' | 'result';
}

export interface CalculationTrace {
  id: string;
  title: string;
  summary: string;
  lines: readonly TraceLine[];
}

export interface CalculationTracesProps {
  traces: readonly CalculationTrace[];
}

export function CalculationTraces({ traces }: CalculationTracesProps) {
  return (
    <section
      aria-labelledby="calculation-traces-heading"
      className={styles.panel}
    >
      <header>
        <h2 id="calculation-traces-heading">Calculation traces</h2>
        <p>Inspect the inputs behind important figures.</p>
      </header>
      {traces.map((trace) => (
        <details key={trace.id}>
          <summary>
            <span>{trace.title}</span>
            <span className={styles.summary}>{trace.summary}</span>
          </summary>
          <dl>
            {trace.lines.map((line) => (
              <div
                className={
                  line.operation === 'result' ? styles.result : undefined
                }
                key={line.id}
              >
                <dt>{line.label}</dt>
                <dd>{line.formattedAmount}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </section>
  );
}
