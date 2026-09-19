import styles from './ScenarioComparison.module.css';

export interface ScenarioCardData {
  id: 'current' | 'optimal' | 'alternative';
  name: string;
  description: string;
  adjustedNetIncome: string;
  annualDisposableCash: string;
  annualPensionInput: string;
  targetHeadroom: string;
}

export interface ScenarioComparisonProps {
  scenarios: readonly ScenarioCardData[];
  selectedScenarioId: ScenarioCardData['id'];
  onSelectScenario?: (id: ScenarioCardData['id']) => void;
  onResetAlternative?: (source: 'current' | 'optimal') => void;
}

export function ScenarioComparison({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onResetAlternative,
}: ScenarioComparisonProps) {
  return (
    <section
      aria-labelledby="scenario-comparison-heading"
      className={styles.panel}
    >
      <header>
        <h2 id="scenario-comparison-heading">Compare scenarios</h2>
        <p>
          Values shown are fixture data until projection logic is connected.
        </p>
      </header>
      <div className={styles.cards}>
        {scenarios.map((scenario) => (
          <article className={styles.card} key={scenario.id}>
            <div>
              <h3>{scenario.name}</h3>
              <p>{scenario.description}</p>
            </div>
            <dl>
              <div>
                <dt>Adjusted net income</dt>
                <dd>{scenario.adjustedNetIncome}</dd>
              </div>
              <div>
                <dt>Annual disposable cash</dt>
                <dd>{scenario.annualDisposableCash}</dd>
              </div>
              <div>
                <dt>Annual pension input</dt>
                <dd>{scenario.annualPensionInput}</dd>
              </div>
              <div>
                <dt>Target headroom</dt>
                <dd>{scenario.targetHeadroom}</dd>
              </div>
            </dl>
            <button
              aria-pressed={selectedScenarioId === scenario.id}
              onClick={() => onSelectScenario?.(scenario.id)}
              type="button"
            >
              {selectedScenarioId === scenario.id
                ? 'Selected'
                : `View ${scenario.name}`}
            </button>
          </article>
        ))}
      </div>
      <div className={styles.actions} aria-label="Alternative scenario actions">
        <button onClick={() => onResetAlternative?.('current')} type="button">
          Reset Alternative to Current
        </button>
        <button onClick={() => onResetAlternative?.('optimal')} type="button">
          Reset Alternative to Optimal
        </button>
      </div>
    </section>
  );
}
