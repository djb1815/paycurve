import { useEffect, useState } from 'react';

import { ProjectionChart, chartFixture } from '../features/chart';
import { InputsPanel, inputsFixture } from '../features/inputs';
import { ReportPanel, reportFixture } from '../features/report';
import {
  ScenarioComparison,
  scenariosFixture,
  type ScenarioCardData,
} from '../features/scenarios';
import { SettingsPanel, type ThemePreference } from '../features/settings';
import { SummaryPanel, summaryFixture } from '../features/summary';
import { CalculationTraces, tracesFixture } from '../features/traces';
import styles from './App.module.css';

export function App() {
  const [fields, setFields] = useState(inputsFixture);
  const [selectedPoint, setSelectedPoint] = useState(1);
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioCardData['id']>('optimal');
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [status, setStatus] = useState(
    'Foundation contracts are ready; figures below are illustrative fixtures.',
  );

  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  function updateField(id: string, value: string) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, value } : field)),
    );
    setStatus(
      'Input captured in the UI fixture; calculations are not connected.',
    );
  }

  function updateCertainty(id: string, certainty: 'forecast' | 'actual') {
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, status: certainty } : field,
      ),
    );
  }

  function explainPending(action: string) {
    setStatus(
      `${action} is defined by the task plan but is not implemented yet.`,
    );
  }

  return (
    <main className={styles.app}>
      <header className={styles.masthead}>
        <p className={styles.kicker}>UK adjusted net income planner</p>
        <h1>See the shape of your salary-sacrifice decision.</h1>
        <p className={styles.lede}>
          Compare adjusted net income, pension funding, and cash outcomes for
          the 2026/27 tax year. The annual model will remain independent of the
          interface and keep financial data in this browser.
        </p>
        <p className={styles.notice} role="status">
          {status}
        </p>
      </header>

      <div className={styles.layout}>
        <div>
          <InputsPanel
            fields={fields}
            onStatusChange={updateCertainty}
            onValueChange={updateField}
          />
          <SettingsPanel
            onExport={() => explainPending('JSON export')}
            onImport={() => explainPending('JSON import')}
            onThemeChange={setTheme}
            storageStatus="Not connected — task T06"
            taxYearLabel="2026/27"
            theme={theme}
          />
        </div>

        <div className={styles.results}>
          <SummaryPanel metrics={summaryFixture} statusMessage="Fixture data" />
          <ProjectionChart
            onSelectedIndexChange={setSelectedPoint}
            points={chartFixture}
            selectedIndex={selectedPoint}
          />
          <ScenarioComparison
            onResetAlternative={(source) =>
              explainPending(`Resetting Alternative to ${source}`)
            }
            onSelectScenario={setSelectedScenario}
            scenarios={scenariosFixture}
            selectedScenarioId={selectedScenario}
          />
          <CalculationTraces traces={tracesFixture} />
          <ReportPanel
            generatedLabel="from illustrative fixture data"
            onPrint={() => window.print()}
            sections={reportFixture}
          />
        </div>
      </div>

      <footer className={styles.footer}>
        Planning estimates are not tax advice. Tax policy values must be
        verified before the calculation tasks are merged.
      </footer>
    </main>
  );
}
