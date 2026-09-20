import type { ChangeEvent } from 'react';

import { HelpPanel, type HelpTopic } from './HelpPanel';
import styles from './SettingsPanel.module.css';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface SettingsImportError {
  readonly title: string;
  readonly detail: string;
}

export interface SettingsPanelProps {
  readonly taxYearLabel: string;
  readonly theme: ThemePreference;
  readonly storageStatus: string;
  readonly onThemeChange?: (theme: ThemePreference) => void;
  /** Starts an import flow when a host does not need access to the selected file. */
  readonly onImport?: () => void;
  /** Receives the selected JSON file for a host-owned import flow. */
  readonly onImportFile?: (file: File) => void;
  readonly onExport?: () => void;
  readonly importError?: SettingsImportError;
  readonly onDismissImportError?: () => void;
  readonly helpTopics?: readonly HelpTopic[];
}

const themes: readonly { readonly value: ThemePreference; readonly label: string }[] = [
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
  onImportFile,
  importError,
  onDismissImportError,
  helpTopics,
}: SettingsPanelProps) {
  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0);
    if (file) onImportFile?.(file);
    event.currentTarget.value = '';
  }

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
      <fieldset className={styles.themes}>
        <legend>Colour theme</legend>
        {themes.map((option) => <label key={option.value}><input checked={theme === option.value} name="theme" onChange={() => onThemeChange?.(option.value)} type="radio" value={option.value} />{option.label}</label>)}
      </fieldset>
      <div className={styles.actions}>
        <button onClick={onExport} type="button">
          Export plan
        </button>
        {onImportFile ? (
          <label className={styles.importButton}>
            Import plan
            <input
              accept="application/json,.json"
              onChange={handleImportFile}
              type="file"
            />
          </label>
        ) : (
          <button onClick={onImport} type="button">
            Import plan
          </button>
        )}
      </div>
      <p className={styles.sensitive}>
        <strong>Data is sensitive:</strong> an export can contain income,
        pension, and tax-planning details. Store it securely and only import a
        file you trust.
      </p>
      {importError ? (
        <div aria-live="assertive" className={styles.importError} role="alert">
          <strong>{importError.title}</strong>
          <p>{importError.detail}</p>
          {onDismissImportError ? (
            <button onClick={onDismissImportError} type="button">
              Dismiss import error
            </button>
          ) : null}
        </div>
      ) : null}
      {helpTopics ? <HelpPanel topics={helpTopics} /> : <HelpPanel />}
    </section>
  );
}
