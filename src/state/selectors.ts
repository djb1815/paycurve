import type { Projection, ScenarioAllocation, ScenarioId } from '../domain';
import type { PayeProjectionResult } from '../payroll';

import type { PlannerDerivedState, PlannerStoreState } from './types';

export interface ScenarioViewModel {
  readonly id: ScenarioId;
  readonly allocation: ScenarioAllocation;
  readonly projection: Projection;
  readonly isSelected: boolean;
}

export const selectHasValidationErrors = (state: PlannerStoreState): boolean =>
  state.validationIssues.some((issue) => issue.severity === 'error');

export const selectActiveDerived = (
  state: PlannerStoreState,
): PlannerDerivedState => state.derived;

export function selectScenarioViewModel(
  state: PlannerStoreState,
  id: ScenarioId,
): ScenarioViewModel {
  const { derived } = state;
  if (id === 'current') {
    return {
      id,
      allocation: derived.current.allocation,
      projection: derived.current.projection,
      isSelected: state.selectedScenarioId === id,
    };
  }
  if (id === 'alternative') {
    return {
      id,
      allocation: derived.alternative.allocation,
      projection: derived.alternative.projection,
      isSelected: state.selectedScenarioId === id,
    };
  }

  const optimal = derived.optimal;
  return {
    id,
    allocation:
      optimal.kind === 'unreachable'
        ? optimal.maximumAllocation
        : optimal.allocation,
    projection: optimal.projection,
    isSelected: state.selectedScenarioId === id,
  };
}

export const selectScenarioViewModels = (
  state: PlannerStoreState,
): readonly ScenarioViewModel[] => [
  selectScenarioViewModel(state, 'current'),
  selectScenarioViewModel(state, 'optimal'),
  selectScenarioViewModel(state, 'alternative'),
];

export const selectPayeAvailability = (
  state: PlannerStoreState,
): PayeProjectionResult => state.derived.paye;

/** The derived plan can lag the draft only while the draft has validation errors. */
export const selectResultsAreStale = (state: PlannerStoreState): boolean =>
  selectHasValidationErrors(state) || state.derived.plan !== state.plan;
