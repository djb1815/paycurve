import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';

import type { CalculationIssue, PlannerState } from '../domain';
import { decodeExport, encodeExport } from '../persistence';
import type { LocalPlanStorage, StorageLike } from '../persistence';
import { validatePlan } from '../projection';
import { createLocalPlanStorage } from '../persistence';
import { resolveTaxYear } from '../tax/config';

import { PlannerContext } from './context';
import {
  createPlannerStoreState,
  DEFAULT_PLANNER_PLAN,
  reducePlannerState,
} from './reducer';
import type {
  ImportStatus,
  PersistenceStatus,
  PlannerAction,
  PlannerActions,
  PlannerContextValue,
  PlannerStateDependencies,
  PlannerStoreState,
  ThemePreference,
} from './types';

const THEME_STORAGE_KEY = 'paycurve.theme.v1';

export interface PlannerProviderProps {
  readonly children: ReactNode;
  /** A valid plan wins over local storage, making embedded/test use predictable. */
  readonly initialPlan?: PlannerState;
  readonly initialTheme?: ThemePreference;
  readonly dependencies?: PlannerStateDependencies;
  readonly storage?: LocalPlanStorage;
  readonly themeStorage?: StorageLike;
}

const defaultDependencies: PlannerStateDependencies = { resolveTaxYear };

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

function browserStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readTheme(
  storage: StorageLike | undefined,
  fallback: ThemePreference,
): ThemePreference {
  if (storage === undefined) return fallback;
  try {
    const saved = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

function importFailure(errors: readonly CalculationIssue[]): ImportStatus {
  return { kind: 'failure', errors };
}

function persistenceFromLoad(
  loaded: ReturnType<LocalPlanStorage['load']>,
): PersistenceStatus {
  if (loaded.kind === 'storageFailure' || loaded.kind === 'corruptData') {
    return { kind: 'failure', failure: loaded };
  }
  return { kind: 'idle' };
}

/**
 * The sole React boundary for planner inputs and all derived calculation data.
 * Calculation modules remain browser-free; only this provider touches storage
 * and document theme attributes.
 */
export function PlannerProvider({
  children,
  dependencies = defaultDependencies,
  initialPlan,
  initialTheme = 'system',
  storage: suppliedStorage,
  themeStorage: suppliedThemeStorage,
}: PlannerProviderProps) {
  const browserLocalStorage = useMemo(() => browserStorage(), []);
  const planStorage = useMemo(
    () =>
      suppliedStorage ??
      (browserLocalStorage === undefined
        ? undefined
        : createLocalPlanStorage(browserLocalStorage)),
    [browserLocalStorage, suppliedStorage],
  );
  const themeStorage = suppliedThemeStorage ?? browserLocalStorage;
  const reducer = useCallback(
    (current: PlannerStoreState, action: PlannerAction) =>
      reducePlannerState(current, action, dependencies),
    [dependencies],
  );
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    (): PlannerStoreState => {
      const theme = readTheme(themeStorage, initialTheme);
      if (initialPlan !== undefined) {
        return createPlannerStoreState(initialPlan, dependencies, theme);
      }
      if (planStorage === undefined) {
        return {
          ...createPlannerStoreState(DEFAULT_PLANNER_PLAN, dependencies, theme),
          persistence: { kind: 'unavailable' },
        };
      }
      const loaded = planStorage.load({
        taxYear: DEFAULT_PLANNER_PLAN.taxYear,
        taxConfigVersion: dependencies.resolveTaxYear(
          DEFAULT_PLANNER_PLAN.taxYear,
        ).version,
      });
      if (loaded.kind !== 'loaded') {
        return {
          ...createPlannerStoreState(DEFAULT_PLANNER_PLAN, dependencies, theme),
          persistence: persistenceFromLoad(loaded),
        };
      }
      const config = dependencies.resolveTaxYear(loaded.value.plan.taxYear);
      const issues = validateImportedPlan(loaded.value.plan, config);
      if (issues.length > 0) {
        return {
          ...createPlannerStoreState(DEFAULT_PLANNER_PLAN, dependencies, theme),
          persistence: {
            kind: 'failure',
            failure: { kind: 'corruptData', errors: [] },
          },
          importStatus: importFailure(issues),
        };
      }
      return createPlannerStoreState(loaded.value.plan, dependencies, theme);
    },
  );

  const savedPlanRef = useRef(state.plan);
  useEffect(() => {
    if (state.plan === savedPlanRef.current) return;
    savedPlanRef.current = state.plan;
    if (planStorage === undefined) {
      dispatch({ type: 'persistenceResult', status: { kind: 'unavailable' } });
      return;
    }
    if (state.validationIssues.some((issue) => issue.severity === 'error')) {
      return;
    }
    const result = planStorage.save(state.plan, {
      taxYear: state.plan.taxYear,
      taxConfigVersion: state.derived.config.version,
    });
    dispatch({
      type: 'persistenceResult',
      status:
        result.kind === 'saved'
          ? { kind: 'saved' }
          : { kind: 'failure', failure: result },
    });
  }, [
    planStorage,
    state.plan,
    state.derived.config.version,
    state.validationIssues,
  ]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (state.theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.dataset.theme = state.theme;
      }
    }
    if (themeStorage === undefined) return;
    try {
      themeStorage.setItem(THEME_STORAGE_KEY, state.theme);
    } catch (error) {
      dispatch({
        type: 'persistenceResult',
        status: {
          kind: 'failure',
          failure: { kind: 'storageFailure', operation: 'write', error },
        },
      });
    }
  }, [state.theme, themeStorage]);

  const importJson = useCallback(
    (input: unknown): boolean => {
      const config = dependencies.resolveTaxYear(state.plan.taxYear);
      const result = decodeExport(input, {
        taxYear: state.plan.taxYear,
        taxConfigVersion: config.version,
      });
      if (result.kind === 'failure') {
        dispatch({
          type: 'importResult',
          status: { kind: 'failure', errors: result.errors },
        });
        return false;
      }
      const importedConfig = dependencies.resolveTaxYear(
        result.value.plan.taxYear,
      );
      const issues = validateImportedPlan(result.value.plan, importedConfig);
      if (issues.length > 0) {
        dispatch({ type: 'importResult', status: importFailure(issues) });
        return false;
      }
      dispatch({ type: 'replacePlan', plan: result.value.plan });
      dispatch({ type: 'importResult', status: { kind: 'success' } });
      return true;
    },
    [dependencies, state.plan.taxYear],
  );

  const reloadFromStorage = useCallback((): boolean => {
    if (planStorage === undefined) {
      dispatch({ type: 'persistenceResult', status: { kind: 'unavailable' } });
      return false;
    }
    const config = dependencies.resolveTaxYear(state.plan.taxYear);
    const loaded = planStorage.load({
      taxYear: state.plan.taxYear,
      taxConfigVersion: config.version,
    });
    if (loaded.kind !== 'loaded') {
      dispatch({
        type: 'persistenceResult',
        status: persistenceFromLoad(loaded),
      });
      return false;
    }
    const issues = validateImportedPlan(
      loaded.value.plan,
      dependencies.resolveTaxYear(loaded.value.plan.taxYear),
    );
    if (issues.length > 0) {
      dispatch({ type: 'importResult', status: importFailure(issues) });
      return false;
    }
    dispatch({ type: 'replacePlan', plan: loaded.value.plan });
    return true;
  }, [dependencies, planStorage, state.plan.taxYear]);

  const actions = useMemo<PlannerActions>(
    () => ({
      dispatch,
      replacePlan: (plan) => dispatch({ type: 'replacePlan', plan }),
      updateFacts: (facts) => dispatch({ type: 'updateFacts', facts }),
      updateAllocation: (scenario, allocation) =>
        dispatch({ type: 'updateAllocation', scenario, allocation }),
      updateAllocationField: (scenario, field, value) =>
        dispatch({ type: 'updateAllocationField', scenario, field, value }),
      updatePlanField: (field, value) =>
        dispatch({ type: 'updatePlanField', field, value }),
      selectScenario: (scenario) =>
        dispatch({ type: 'selectScenario', scenario }),
      resetAlternative: (source) =>
        dispatch({ type: 'resetAlternative', source }),
      setTheme: (theme) => dispatch({ type: 'setTheme', theme }),
      importJson,
      reloadFromStorage,
      exportJson: (exportedAt) =>
        encodeExport(state.plan, state.derived.config.version, exportedAt),
      dismissImportError: () =>
        dispatch({ type: 'importResult', status: { kind: 'idle' } }),
    }),
    [importJson, reloadFromStorage, state.derived.config.version, state.plan],
  );

  const value = useMemo<PlannerContextValue>(
    () => ({ state, actions }),
    [actions, state],
  );
  return <PlannerContext value={value}>{children}</PlannerContext>;
}

function validateImportedPlan(
  plan: PlannerState,
  config: ReturnType<PlannerStateDependencies['resolveTaxYear']>,
): readonly CalculationIssue[] {
  return validatePlan(plan, config).filter(
    (issue) => issue.severity === 'error',
  );
}
