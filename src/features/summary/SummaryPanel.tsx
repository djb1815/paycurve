import styles from './SummaryPanel.module.css';

export interface SummaryMetric {
  id: string;
  label: string;
  formattedValue: string;
  detail?: string;
  emphasis?: 'default' | 'positive' | 'warning';
}

export interface SummaryPanelProps {
  title?: string;
  metrics: readonly SummaryMetric[];
  statusMessage?: string;
}

export function SummaryPanel({
  title = 'Plan summary',
  metrics,
  statusMessage,
}: SummaryPanelProps) {
  return (
    <section aria-labelledby="plan-summary-heading" className={styles.panel}>
      <div className={styles.heading}>
        <h2 id="plan-summary-heading">{title}</h2>
        {statusMessage ? <p role="status">{statusMessage}</p> : null}
      </div>
      <dl className={styles.metrics}>
        {metrics.map((metric) => (
          <div className={styles[metric.emphasis ?? 'default']} key={metric.id}>
            <dt>{metric.label}</dt>
            <dd>{metric.formattedValue}</dd>
            {metric.detail ? (
              <dd className={styles.detail}>{metric.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
