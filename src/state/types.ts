import type {
  CalculationIssue,
  CurvePoint,
  Insight,
  OptimisationResult,
  PlannerState,
  Projection,
  ScenarioAllocation,
  ScenarioComparison,
  ScenarioId,
} from '../domain';
import type { PayeProjectionResult } from '../payroll';
import type { ImportError, StorageFailure } from '../persistence';
import type { TaxYearConfig } from '../tax/config';

export type ThemePreference = 'system' | 'light' | 'dark';

export type EditableScenarioId = Exclude<ScenarioId, 'optimal'>;

export interface PlannerDerivedState {
  /** The last planner input set that passed whole-plan validation. */
  readonly plan: PlannerState;
  readonly config: TaxYearConfig;
  readonly current: {
    readonly allocation: ScenarioAllocation;
    readonly projection: Projection;
  };
  readonly alternative: {
    readonly allocation: ScenarioAllocation;
    readonly projection: Projection;
  };
  readonly optimal: OptimisationResult;
  readonly comparison: ScenarioComparison;
  readonly curve: readonly CurvePoint[];
  readonly insights: readonly Insight[];
  /** This is intentionally separate from the annual source-of-truth projection. */
  readonly paye: PayeProjectionResult;
}

export type PersistenceStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'failure'; readonly failure: StorageFailure };

export type ImportStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'success' }
  | {
      readonly kind: 'failure';
      readonly errors: readonly (ImportError | CalculationIssue)[];
    };

export interface PlannerStoreState {
  /** Editable inputs, including values that may currently be invalid. */
  readonly plan: PlannerState;
  /**
   * Derived values are never persisted. They are retained when a draft edit is
   * invalid so an invalid keystroke cannot replace a previously valid result.
   */
  readonly derived: PlannerDerivedState;
  readonly validationIssues: readonly CalculationIssue[];
  readonly selectedScenarioId: ScenarioId;
  readonly theme: ThemePreference;
  readonly persistence: PersistenceStatus;
  readonly importStatus: ImportStatus;
}

export interface PlannerActions {
  readonly dispatch: (action: PlannerAction) => void;
  readonly replacePlan: (plan: PlannerState) => void;
  readonly updateFacts: (facts: PlannerState['facts']) => void;
  readonly updateAllocation: (
    scenario: EditableScenarioId,
    allocation: ScenarioAllocation,
  ) => void;
  readonly updateAllocationField: (
    scenario: EditableScenarioId,
    field: keyof ScenarioAllocation,
    value: number,
  ) => void;
  readonly updatePlanField: (
    field: 'targetAni' | 'maxAdditionalRegularSalarySacrifice',
    value: number,
  ) => void;
  readonly selectScenario: (scenario: ScenarioId) => void;
  readonly resetAlternative: (source: 'current' | 'optimal') => void;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly importJson: (input: unknown) => boolean;
  readonly reloadFromStorage: () => boolean;
  readonly exportJson: (exportedAt?: Date) => string;
  readonly dismissImportError: () => void;
}

export interface PlannerContextValue {
  readonly state: PlannerStoreState;
  readonly actions: PlannerActions;
}

export interface PlannerStateDependencies {
  readonly resolveTaxYear: (taxYear: PlannerState['taxYear']) => TaxYearConfig;
  readonly curvePointCount?: number;
  readonly nearThresholdMarginPence?: number;
}

export type PlannerAction =
  | { readonly type: 'replacePlan'; readonly plan: PlannerState }
  | { readonly type: 'updateFacts'; readonly facts: PlannerState['facts'] }
  | {
      readonly type: 'updateAllocation';
      readonly scenario: EditableScenarioId;
      readonly allocation: ScenarioAllocation;
    }
  | {
      readonly type: 'updateAllocationField';
      readonly scenario: EditableScenarioId;
      readonly field: keyof ScenarioAllocation;
      readonly value: number;
    }
  | {
      readonly type: 'updatePlanField';
      readonly field: 'targetAni' | 'maxAdditionalRegularSalarySacrifice';
      readonly value: number;
    }
  | { readonly type: 'selectScenario'; readonly scenario: ScenarioId }
  | {
      readonly type: 'resetAlternative';
      readonly source: 'current' | 'optimal';
    }
  | { readonly type: 'setTheme'; readonly theme: ThemePreference }
  | { readonly type: 'persistenceResult'; readonly status: PersistenceStatus }
  | { readonly type: 'importResult'; readonly status: ImportStatus };
