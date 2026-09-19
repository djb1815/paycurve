import styles from './ScenarioComparison.module.css';

export type ScenarioComparisonStatus = 'ready' | 'invalid' | 'unreachable';

export interface ScenarioCardData {
  readonly id: 'current' | 'optimal' | 'alternative';
  readonly name: string;
  readonly description: string;
  readonly adjustedNetIncome: string;
  readonly annualNetEmploymentPay?: string;
  readonly annualDisposableCash: string;
  readonly annualPensionInput: string;
  readonly targetHeadroom: string;
}

export interface ScenarioComparisonProps {
  readonly scenarios: readonly ScenarioCardData[];
  readonly selectedScenarioId: ScenarioCardData['id'];
  readonly status?: ScenarioComparisonStatus;
  readonly statusMessage?: string;
  readonly onSelectScenario?: (id: ScenarioCardData['id']) => void;
  readonly onResetAlternative?: (source: 'current' | 'optimal') => void;
}

interface ComparisonMetric {
  readonly label: string;
  readonly valueFor: (scenario: ScenarioCardData) => string;
}

const comparisonMetrics: readonly ComparisonMetric[] = [
  {
    label: 'Adjusted net income',
    valueFor: (scenario) => scenario.adjustedNetIncome,
  },
  {
    label: 'Annual net employment pay',
    valueFor: (scenario) => scenario.annualNetEmploymentPay ?? 'Not supplied',
  },
  {
    label: 'Annual disposable cash',
    valueFor: (scenario) => scenario.annualDisposableCash,
  },
  {
    label: 'Annual pension input',
    valueFor: (scenario) => scenario.annualPensionInput,
  },
  { label: 'Target headroom', valueFor: (scenario) => scenario.targetHeadroom },
];

function defaultStatusMessage(status: ScenarioComparisonStatus | undefined) {
  if (status === 'invalid') {
    return 'Correct the plan inputs before scenario results can be compared.';
  }
  if (status === 'unreachable') {
    return 'The target is unreachable within the current sacrifice limit. The maximum available Alternative is still shown for comparison.';
  }
  return undefined;
}

export function ScenarioComparison({
  onResetAlternative,
  onSelectScenario,
  scenarios,
  selectedScenarioId,
  status = 'ready',
  statusMessage,
}: ScenarioComparisonProps) {
  const message = statusMessage ?? defaultStatusMessage(status);
  const hasAlternative = scenarios.some(
    (scenario) => scenario.id === 'alternative',
  );

  return (
    <section
      aria-labelledby="scenario-comparison-heading"
      className={styles.panel}
    >
      <header>
        <h2 id="scenario-comparison-heading">Compare scenarios</h2>
        <p>
          Each scenario keeps ANI, net employment pay, disposable cash, and
          pension input separate.
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

      {scenarios.length === 0 ? (
        <p className={styles.status} role="status">
          Scenario comparisons will appear after the plan has valid projection
          results.
        </p>
      ) : (
        <>
          <fieldset className={styles.cards}>
            <legend>Select a scenario to inspect</legend>
            {scenarios.map((scenario) => {
              const isSelected = selectedScenarioId === scenario.id;
              return (
                <label
                  className={styles.card}
                  data-selected={isSelected || undefined}
                  key={scenario.id}
                >
                  <input
                    checked={isSelected}
                    name="selected-scenario"
                    onChange={() => onSelectScenario?.(scenario.id)}
                    type="radio"
                    value={scenario.id}
                  />
                  <span className={styles.cardContent}>
                    <span>
                      <span className={styles.cardTitle}>{scenario.name}</span>
                      <span className={styles.description}>
                        {scenario.description}
                      </span>
                    </span>
                    <dl>
                      <div>
                        <dt>Adjusted net income</dt>
                        <dd>{scenario.adjustedNetIncome}</dd>
                      </div>
                      <div>
                        <dt>Annual net employment pay</dt>
                        <dd>
                          {scenario.annualNetEmploymentPay ?? 'Not supplied'}
                        </dd>
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
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div
            aria-label="Alternative scenario actions"
            className={styles.actions}
            data-print-hidden="true"
          >
            <button
              disabled={!hasAlternative}
              onClick={() => onResetAlternative?.('current')}
              type="button"
            >
              Reset Alternative to Current
            </button>
            <button
              disabled={!hasAlternative}
              onClick={() => onResetAlternative?.('optimal')}
              type="button"
            >
              Reset Alternative to Optimal
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <caption>Exact scenario comparison</caption>
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  {scenarios.map((scenario) => (
                    <th key={scenario.id} scope="col">
                      {scenario.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonMetrics.map(({ label, valueFor }) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {scenarios.map((scenario) => (
                      <td key={scenario.id}>{valueFor(scenario)}</td>
                    ))}
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
