import styles from './InputsPanel.module.css';

export interface PlannerInputField {
  id: string;
  label: string;
  value: string;
  helpText: string;
  status?: 'forecast' | 'actual';
}

export interface InputsPanelProps {
  fields: readonly PlannerInputField[];
  onValueChange?: (id: string, value: string) => void;
  onStatusChange?: (id: string, status: 'forecast' | 'actual') => void;
}

export function InputsPanel({
  fields,
  onValueChange,
  onStatusChange,
}: InputsPanelProps) {
  return (
    <section aria-labelledby="income-inputs-heading" className={styles.panel}>
      <header>
        <p className={styles.eyebrow}>Plan inputs</p>
        <h2 id="income-inputs-heading">Income and adjustments</h2>
        <p>
          Enter annual amounts in pounds. These placeholders do not calculate a
          projection yet.
        </p>
      </header>

      <div className={styles.grid}>
        {fields.map((field) => {
          const helpId = `${field.id}-help`;
          return (
            <div className={styles.field} key={field.id}>
              <label htmlFor={field.id}>{field.label}</label>
              <div className={styles.moneyInput}>
                <span aria-hidden="true">£</span>
                <input
                  aria-describedby={helpId}
                  id={field.id}
                  inputMode="decimal"
                  name={field.id}
                  onChange={(event) =>
                    onValueChange?.(field.id, event.currentTarget.value)
                  }
                  type="text"
                  value={field.value}
                />
              </div>
              <p className={styles.help} id={helpId}>
                {field.helpText}
              </p>
              {field.status ? (
                <label className={styles.status}>
                  Certainty
                  <select
                    onChange={(event) =>
                      onStatusChange?.(
                        field.id,
                        event.currentTarget.value as 'forecast' | 'actual',
                      )
                    }
                    value={field.status}
                  >
                    <option value="forecast">Forecast</option>
                    <option value="actual">Actual</option>
                  </select>
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
