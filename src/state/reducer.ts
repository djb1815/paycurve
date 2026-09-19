import type { CalculationIssue, PlannerState } from '../domain';
import { validatePlan } from '../projection';

import { derivePlannerState } from './derive';
import type {
  PlannerAction,
  PlannerStateDependencies,
  PlannerStoreState,
  ThemePreference,
} from './types';

export const DEFAULT_PLANNER_PLAN: PlannerState = {
  taxYear: '2026/27',
  targetAni: 10_000_000,
  maxAdditionalRegularSalarySacrifice: 0,
  facts: {
    baseSalary: 0,
    bonus: { guidePercentage: 0 },
    equityIncome: [],
    taxableBenefits: { amount: 0, certainty: 'actual' },
    savingsInterest: { amount: 0, certainty: 'actual' },
    otherTaxableIncome: 0,
    employerPensionContribution: 0,
  },
  current: {
    regularSalarySacrifice: 0,
    bonusSalarySacrifice: 0,
    sippNetContribution: 0,
    giftAidCashDonation: 0,
  },
  alternative: {
    regularSalarySacrifice: 0,
    bonusSalarySacrifice: 0,
    sippNetContribution: 0,
    giftAidCashDonation: 0,
  },
};

const hasErrors = (issues: readonly CalculationIssue[]): boolean =>
  issues.some((issue) => issue.severity === 'error');

export function createPlannerStoreState(
  plan: PlannerState,
  dependencies: PlannerStateDependencies,
  theme: ThemePreference = 'system',
): PlannerStoreState {
  const config = dependencies.resolveTaxYear(plan.taxYear);
  const validationIssues = validatePlan(plan, config);
  if (hasErrors(validationIssues)) {
    throw new Error('Initial planner state must be valid.');
  }
  return {
    plan,
    derived: derivePlannerState(plan, dependencies),
    validationIssues,
    selectedScenarioId: 'current',
    theme,
    persistence: { kind: 'idle' },
    importStatus: { kind: 'idle' },
  };
}

function applyPlan(
  state: PlannerStoreState,
  plan: PlannerState,
  dependencies: PlannerStateDependencies,
): PlannerStoreState {
  const config = dependencies.resolveTaxYear(plan.taxYear);
  const validationIssues = validatePlan(plan, config);
  return {
    ...state,
    plan,
    validationIssues,
    ...(hasErrors(validationIssues)
      ? {}
      : { derived: derivePlannerState(plan, dependencies) }),
    importStatus: { kind: 'idle' },
  };
}

/**
 * Pure state reducer. Only Current and Alternative are editable: Optimal is
 * a derived optimisation result and therefore intentionally has no action.
 */
export function reducePlannerState(
  state: PlannerStoreState,
  action: PlannerAction,
  dependencies: PlannerStateDependencies,
): PlannerStoreState {
  switch (action.type) {
    case 'replacePlan':
      return applyPlan(state, action.plan, dependencies);
    case 'updateFacts':
      return applyPlan(
        state,
        { ...state.plan, facts: action.facts },
        dependencies,
      );
    case 'updateAllocation':
      return applyPlan(
        state,
        { ...state.plan, [action.scenario]: action.allocation },
        dependencies,
      );
    case 'updateAllocationField':
      return applyPlan(
        state,
        {
          ...state.plan,
          [action.scenario]: {
            ...state.plan[action.scenario],
            [action.field]: action.value,
          },
        },
        dependencies,
      );
    case 'updatePlanField':
      return applyPlan(
        state,
        { ...state.plan, [action.field]: action.value },
        dependencies,
      );
    case 'selectScenario':
      return { ...state, selectedScenarioId: action.scenario };
    case 'resetAlternative': {
      const allocation =
        action.source === 'current'
          ? state.plan.current
          : state.derived.optimal.kind === 'unreachable'
            ? state.derived.optimal.maximumAllocation
            : state.derived.optimal.allocation;
      return applyPlan(
        state,
        { ...state.plan, alternative: { ...allocation } },
        dependencies,
      );
    }
    case 'setTheme':
      return { ...state, theme: action.theme };
    case 'persistenceResult':
      return { ...state, persistence: action.status };
    case 'importResult':
      return { ...state, importStatus: action.status };
  }
}
