import { useMemo, useState } from 'react';

import type { PlanFacts, ScenarioAllocation, ScenarioId } from '../domain';
import { ProjectionChart } from '../features/chart';
import { InputsPanel, type InputCertainty } from '../features/inputs';
import { ReportPanel } from '../features/report';
import { ScenarioComparison } from '../features/scenarios';
import { SettingsPanel } from '../features/settings';
import { SummaryPanel } from '../features/summary';
import { selectResultsAreStale, usePlanner } from '../state';

import { downloadPlanExport } from './export';
import {
  equityFieldDetails,
  inputForm,
  type EditableScenario,
  type RawValues,
} from './input-adapters';
import {
  curveMarkers,
  curvePoints,
  importError,
  payeStatus,
  planningReport,
  selectedCurveIndex,
  scenarioCards,
  storageStatus,
  summaryOutcome,
} from './result-adapters';
import styles from './App.module.css';

let nextEquityEventId = 1;

function newEquityEventId(existingIds: readonly string[]): string {
  let id = `equity-event-${nextEquityEventId}`;
  while (existingIds.includes(id)) {
    nextEquityEventId += 1;
    id = `equity-event-${nextEquityEventId}`;
  }
  nextEquityEventId += 1;
  return id;
}

export function PlannerApplication() {
  const { actions, state } = usePlanner();
  const [rawValues, setRawValues] = useState<RawValues>({});
  const [activeView, setActiveView] = useState<'summary' | 'plan' | 'report'>(
    () => (state.plan.facts.baseSalary > 0 ? 'summary' : 'plan'),
  );
  const selectedScenario = state.selectedScenarioId;
  const editableScenario: EditableScenario =
    selectedScenario === 'alternative' ? 'alternative' : 'current';
  const stale = selectResultsAreStale(state);
  const form = useMemo(
    () => inputForm(state, editableScenario, rawValues),
    [editableScenario, rawValues, state],
  );
  const points = useMemo(() => curvePoints(state), [state]);
  const selectedIndex = selectedCurveIndex(state);
  const settingsImportError = importError(state);

  function updateFacts(update: (facts: PlanFacts) => PlanFacts) {
    actions.updateFacts(update(state.plan.facts));
  }

  function updateAllocation(field: keyof ScenarioAllocation, value: number) {
    actions.updateAllocationField(editableScenario, field, value);
  }

  function setRaw(id: string, value: string) {
    setRawValues((current) => ({ ...current, [id]: value }));
  }

  function updatePence(id: string, value: number | undefined) {
    const invalid = value ?? -1;
    const equity = equityFieldDetails(id);
    if (equity?.field === 'amount') {
      updateFacts((facts) => ({
        ...facts,
        equityIncome: facts.equityIncome.map((income) =>
          income.id === equity.eventId
            ? { ...income, amount: invalid }
            : income,
        ),
      }));
      return;
    }
    switch (id) {
      case 'base-salary':
        updateFacts((facts) => ({ ...facts, baseSalary: invalid }));
        if (
          state.plan.maxAdditionalRegularSalarySacrifice === 0 &&
          invalid > 0
        ) {
          actions.updatePlanField(
            'maxAdditionalRegularSalarySacrifice',
            Math.round(invalid / 2),
          );
        }
        return;
      case 'bonus-override':
        updateFacts((facts) => ({
          ...facts,
          bonus:
            value === undefined
              ? (() => {
                  const { amountOverride: _amountOverride, ...bonus } =
                    facts.bonus;
                  return bonus;
                })()
              : {
                  ...facts.bonus,
                  amountOverride: {
                    amount: invalid,
                    certainty:
                      facts.bonus.amountOverride?.certainty ?? 'forecast',
                  },
                },
        }));
        return;
      case 'taxable-benefits':
        updateFacts((facts) => ({
          ...facts,
          taxableBenefits: { ...facts.taxableBenefits, amount: invalid },
        }));
        return;
      case 'savings-interest':
        updateFacts((facts) => ({
          ...facts,
          savingsInterest: { ...facts.savingsInterest, amount: invalid },
        }));
        return;
      case 'other-taxable-income':
        updateFacts((facts) => ({ ...facts, otherTaxableIncome: invalid }));
        return;
      case 'employer-pension-contribution':
        updateFacts((facts) => ({
          ...facts,
          employerPensionContribution: invalid,
        }));
        return;
      case 'regular-salary-sacrifice':
        updateAllocation('regularSalarySacrifice', invalid);
        return;
      case 'max-additional-regular-salary-sacrifice':
        actions.updatePlanField('maxAdditionalRegularSalarySacrifice', invalid);
        return;
      case 'bonus-salary-sacrifice':
        updateAllocation('bonusSalarySacrifice', invalid);
        return;
      case 'sipp-net-contribution':
        updateAllocation('sippNetContribution', invalid);
        return;
      case 'gift-aid-cash-donation':
        updateAllocation('giftAidCashDonation', invalid);
        return;
      case 'target-ani':
        actions.updatePlanField('targetAni', invalid);
        return;
      case 'payroll-next-period-additional-gross-pay':
      case 'payroll-year-to-date-taxable-pay':
      case 'payroll-year-to-date-income-tax-paid':
        updateFacts((facts) => {
          const payroll = facts.payroll;
          if (!payroll) return facts;
          const yearToDate = payroll.yearToDate ?? {
            completedPeriods: 0,
            taxablePay: 0,
            incomeTaxPaid: 0,
          };
          return {
            ...facts,
            payroll: {
              ...payroll,
              ...(id === 'payroll-next-period-additional-gross-pay'
                ? { nextPeriodAdditionalGrossPay: invalid }
                : {
                    yearToDate: {
                      ...yearToDate,
                      ...(id === 'payroll-year-to-date-taxable-pay'
                        ? { taxablePay: invalid }
                        : { incomeTaxPaid: invalid }),
                    },
                  }),
            },
          };
        });
    }
  }

  function updateValue(id: string, value: string) {
    setRaw(id, value);
    const equity = equityFieldDetails(id);
    if (id === 'regular-salary-sacrifice-rate') {
      const percentage = Number(value);
      if (Number.isFinite(percentage)) {
        updateAllocation(
          'regularSalarySacrifice',
          Math.round((state.plan.facts.baseSalary * percentage) / 100),
        );
      }
      return;
    }
    if (id === 'max-additional-regular-salary-sacrifice-rate') {
      const percentage = Number(value);
      if (Number.isFinite(percentage)) {
        actions.updatePlanField(
          'maxAdditionalRegularSalarySacrifice',
          Math.round((state.plan.facts.baseSalary * percentage) / 100),
        );
      }
      return;
    }
    if (id === 'equity-add-event' && value === 'true') {
      updateFacts((facts) => ({
        ...facts,
        equityIncome: [
          ...facts.equityIncome,
          {
            id: newEquityEventId(facts.equityIncome.map((income) => income.id)),
            amount: 0,
            certainty: 'forecast',
          },
        ],
      }));
      return;
    }
    if (equity?.field === 'remove' && value === 'true') {
      updateFacts((facts) => ({
        ...facts,
        equityIncome: facts.equityIncome.filter(
          (income) => income.id !== equity.eventId,
        ),
      }));
      return;
    }
    if (equity?.field === 'label' || equity?.field === 'vest-date') {
      updateFacts((facts) => ({
        ...facts,
        equityIncome: facts.equityIncome.map((income) => {
          if (income.id !== equity.eventId) return income;
          if (equity.field === 'label') {
            const { label: _label, ...withoutLabel } = income;
            return value.trim() === ''
              ? withoutLabel
              : { ...income, label: value };
          }
          const { vestDate: _vestDate, ...withoutVestDate } = income;
          return value.trim() === ''
            ? withoutVestDate
            : { ...income, vestDate: value };
        }),
      }));
      return;
    }
    if (id === 'bonus-guide-percentage') {
      const percentage = Number(value);
      updateFacts((facts) => ({
        ...facts,
        bonus: {
          ...facts.bonus,
          guidePercentage: Number.isFinite(percentage)
            ? Math.round(percentage * 100)
            : -1,
        },
      }));
    }
    if (id === 'sacrifice-full-bonus') {
      const bonusIncome =
        state.derived.current.projection.traces.adjustedNetIncome.steps.find(
          (step) => step.code === 'bonusIncome',
        )?.amount ?? 0;
      updateAllocation(
        'bonusSalarySacrifice',
        value === 'true' ? bonusIncome : 0,
      );
    }
    if (id === 'payroll-tax-code') {
      updateFacts((facts) =>
        facts.payroll
          ? { ...facts, payroll: { ...facts.payroll, taxCode: value } }
          : facts,
      );
    }
    if (id === 'payroll-tax-code-basis' || id === 'payroll-pay-frequency') {
      updateFacts((facts) =>
        facts.payroll
          ? {
              ...facts,
              payroll: {
                ...facts.payroll,
                ...(id === 'payroll-tax-code-basis'
                  ? { taxCodeBasis: value as 'cumulative' | 'month1Week1' }
                  : {
                      payFrequency: value as
                        'monthly' | 'fourWeekly' | 'fortnightly' | 'weekly',
                    }),
              },
            }
          : facts,
      );
    }
    if (id === 'payroll-year-to-date-periods') {
      const completedPeriods = Number(value);
      updateFacts((facts) => {
        const payroll = facts.payroll;
        if (!payroll) return facts;
        return {
          ...facts,
          payroll: {
            ...payroll,
            yearToDate: {
              completedPeriods:
                Number.isInteger(completedPeriods) && completedPeriods >= 0
                  ? completedPeriods
                  : -1,
              taxablePay: payroll.yearToDate?.taxablePay ?? 0,
              incomeTaxPaid: payroll.yearToDate?.incomeTaxPaid ?? 0,
            },
          },
        };
      });
    }
  }

  function updateCertainty(id: string, certainty: InputCertainty) {
    updateFacts((facts) => {
      if (id === 'bonus-override' && facts.bonus.amountOverride) {
        return {
          ...facts,
          bonus: {
            ...facts.bonus,
            amountOverride: { ...facts.bonus.amountOverride, certainty },
          },
        };
      }
      const equity = equityFieldDetails(id);
      if (equity?.field === 'amount') {
        return {
          ...facts,
          equityIncome: facts.equityIncome.map((income) =>
            income.id === equity.eventId ? { ...income, certainty } : income,
          ),
        };
      }
      if (id === 'taxable-benefits') {
        return {
          ...facts,
          taxableBenefits: { ...facts.taxableBenefits, certainty },
        };
      }
      if (id === 'savings-interest') {
        return {
          ...facts,
          savingsInterest: { ...facts.savingsInterest, certainty },
        };
      }
      return facts;
    });
  }

  function togglePayroll(enabled: boolean) {
    updateFacts((facts) => {
      if (!enabled) {
        const { payroll: _payroll, ...withoutPayroll } = facts;
        return withoutPayroll;
      }
      if (facts.payroll) return facts;
      return {
        ...facts,
        payroll: {
          taxCode: '',
          taxCodeBasis: 'cumulative',
          payFrequency: 'monthly',
        },
      };
    });
  }

  async function importFile(file: File) {
    setRawValues({});
    actions.importJson(await file.text());
  }

  function selectScenario(id: ScenarioId) {
    actions.selectScenario(id);
    if (id !== 'optimal') setRawValues({});
  }

  return (
    <main className={styles.app}>
      <header className={styles.masthead}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.kicker}>UK adjusted net income planner</p>
            <h1>See the shape of your salary-sacrifice decision.</h1>
          </div>
          <fieldset className={styles.themeMenu}>
            <legend>Theme</legend>
            {(['system', 'light', 'dark'] as const).map((theme) => (
              <label key={theme} title={`${theme} theme`}>
                <input
                  checked={state.theme === theme}
                  name="header-theme"
                  onChange={() => actions.setTheme(theme)}
                  type="radio"
                  value={theme}
                />
                <span aria-hidden="true">
                  {theme === 'system' ? '◐' : theme === 'light' ? '☀' : '◑'}
                </span>
                <span className={styles.visuallyHidden}>{theme}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <p className={styles.lede}>
          Compare adjusted net income, pension funding, and cash outcomes for
          the {state.plan.taxYear} tax year. Financial inputs stay in this
          browser and are never sent to a service.
        </p>
        <nav
          aria-label="Planner sections"
          className={styles.tabs}
          data-print-hidden="true"
        >
          {(
            [
              ['summary', 'Summary'],
              ['plan', 'Plan inputs'],
              ['report', 'Print report'],
            ] as const
          ).map(([view, label]) => (
            <button
              aria-current={activeView === view ? 'page' : undefined}
              className={activeView === view ? styles.activeTab : undefined}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <p className={styles.notice} role="status">
          {stale
            ? 'Correct the highlighted inputs. The last valid calculation remains visible while this draft is invalid.'
            : payeStatus(state.derived.paye)}
        </p>
      </header>

      {activeView === 'plan' ? (
        <div className={styles.singleView}>
          <InputsPanel
            fields={[]}
            form={form}
            onPayrollDisclosureChange={togglePayroll}
            onPenceValueChange={updatePence}
            onStatusChange={updateCertainty}
            onValueChange={updateValue}
          />
          <SettingsPanel
            {...(settingsImportError === undefined
              ? {}
              : { importError: settingsImportError })}
            onDismissImportError={actions.dismissImportError}
            onExport={() => downloadPlanExport(actions.exportJson())}
            onImportFile={(file) => void importFile(file)}
            onThemeChange={actions.setTheme}
            storageStatus={storageStatus(state)}
            taxYearLabel={state.plan.taxYear}
            theme={state.theme}
          />
        </div>
      ) : null}
      {activeView === 'summary' ? (
        <div className={styles.results}>
          <SummaryPanel
            outcome={summaryOutcome(state, selectedScenario)}
            statusMessage={
              stale
                ? 'Results are stale while the draft is invalid.'
                : payeStatus(state.derived.paye)
            }
          />
          <ProjectionChart
            markers={curveMarkers(state)}
            onSelectedIndexChange={(index) => {
              const point = state.derived.curve[index];
              if (point) {
                actions.resetAlternative('current');
                actions.updateAllocationField(
                  'alternative',
                  'regularSalarySacrifice',
                  state.plan.current.regularSalarySacrifice +
                    point.additionalRegularSalarySacrifice,
                );
                actions.selectScenario('alternative');
              }
            }}
            points={stale ? [] : points}
            selectedIndex={selectedIndex}
            targetAniPence={state.plan.targetAni}
            status={
              stale
                ? 'invalid'
                : state.derived.optimal.kind === 'unreachable'
                  ? 'unreachable'
                  : 'ready'
            }
          />
          <ScenarioComparison
            onResetAlternative={actions.resetAlternative}
            onSelectScenario={selectScenario}
            scenarios={stale ? [] : scenarioCards(state)}
            selectedScenarioId={selectedScenario}
            status={
              stale
                ? 'invalid'
                : state.derived.optimal.kind === 'unreachable'
                  ? 'unreachable'
                  : 'ready'
            }
          />
        </div>
      ) : null}
      {activeView === 'report' ? (
        <div className={styles.singleView}>
          <ReportPanel
            generatedLabel="from your current local plan"
            onPrint={() => window.print()}
            report={planningReport(state)}
            sections={[]}
          />
        </div>
      ) : null}

      <footer className={styles.footer}>
        Planning estimates are not tax advice. Check salary-sacrifice and
        pension restrictions with your employer or adviser.
      </footer>
    </main>
  );
}
