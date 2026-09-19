import { useState } from 'react';

import styles from './CalculationTraces.module.css';
import { traceLabel } from './copy';

export interface TraceLine {
  id: string;
  /** Stable calculation code when the integration layer has one. */
  code?: string;
  /** Display label supplied by the integration layer, if more specific than the code. */
  label?: string;
  formattedAmount: string;
  operation?: 'input' | 'add' | 'subtract' | 'result';
}

export interface TraceTotal {
  /** The total supplied by the calculation layer; rows are not re-summed in the UI. */
  formattedAmount: string;
  label?: string;
}

export interface CalculationTrace {
  id: string;
  title: string;
  summary: string;
  lines: readonly TraceLine[];
  /** Makes the supplied total visibly distinct from the component's display rows. */
  total?: TraceTotal;
}

export interface CalculationTracesProps {
  traces: readonly CalculationTrace[];
}

export function CalculationTraces({ traces }: CalculationTracesProps) {
  const [expandedTraceIds, setExpandedTraceIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  function setTraceExpanded(id: string, expanded: boolean) {
    setExpandedTraceIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  }

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
        <details
          key={trace.id}
          onToggle={(event) =>
            setTraceExpanded(trace.id, event.currentTarget.open)
          }
          open={expandedTraceIds.has(trace.id)}
        >
          <summary
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setTraceExpanded(trace.id, !expandedTraceIds.has(trace.id));
              }
            }}
          >
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
                <dt>{traceLabel(line.code, line.label)}</dt>
                <dd>{line.formattedAmount}</dd>
              </div>
            ))}
          </dl>
          {trace.total ? (
            <p className={styles.total}>
              <strong>{trace.total.label ?? 'Supplied total'}:</strong>{' '}
              {trace.total.formattedAmount}
            </p>
          ) : null}
        </details>
      ))}
    </section>
  );
}
