import styles from './SettingsPanel.module.css';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface SettingsPanelProps {
  taxYearLabel: string;
  theme: ThemePreference;
  storageStatus: string;
  onThemeChange?: (theme: ThemePreference) => void;
  onExport?: () => void;
  onImport?: () => void;
}

const themes: readonly { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPanel({
  taxYearLabel,
  theme,
  storageStatus,
  onThemeChange,
  onExport,
  onImport,
}: SettingsPanelProps) {
  return (
    <section aria-labelledby="settings-heading" className={styles.panel}>
      <header>
        <h2 id="settings-heading">Settings</h2>
        <p>Control display and local plan data.</p>
      </header>
      <dl>
        <div>
          <dt>Tax year</dt>
          <dd>{taxYearLabel}</dd>
        </div>
        <div>
          <dt>Storage</dt>
          <dd>{storageStatus}</dd>
        </div>
      </dl>
      <fieldset>
        <legend>Colour theme</legend>
        <div className={styles.themes}>
          {themes.map((option) => (
            <label key={option.value}>
              <input
                checked={theme === option.value}
                name="theme"
                onChange={() => onThemeChange?.(option.value)}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.actions}>
        <button onClick={onExport} type="button">
          Export plan
        </button>
        <button onClick={onImport} type="button">
          Import plan
        </button>
      </div>
      <p className={styles.privacy}>
        Your financial plan stays in this browser unless you explicitly export
        it.
      </p>
    </section>
  );
}
