import styles from './ReportPanel.module.css';

export interface ReportSection {
  id: string;
  heading: string;
  body: string;
}

export interface ReportPanelProps {
  generatedLabel: string;
  sections: readonly ReportSection[];
  onPrint?: () => void;
}

export function ReportPanel({
  generatedLabel,
  sections,
  onPrint,
}: ReportPanelProps) {
  return (
    <section aria-labelledby="report-heading" className={styles.panel}>
      <header>
        <div>
          <p className={styles.eyebrow}>Planning record</p>
          <h2 id="report-heading">Scenario report</h2>
        </div>
        <button onClick={onPrint} type="button">
          Print report
        </button>
      </header>
      <p>
        Prepared {generatedLabel}. Financial values will be included when
        calculation outputs are connected.
      </p>
      {sections.map((section) => (
        <article key={section.id}>
          <h3>{section.heading}</h3>
          <p>{section.body}</p>
        </article>
      ))}
    </section>
  );
}
