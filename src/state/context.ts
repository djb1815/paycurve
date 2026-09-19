import { createContext, useContext } from 'react';

import type {
  PlannerActions,
  PlannerContextValue,
  PlannerStoreState,
} from './types';

export const PlannerContext = createContext<PlannerContextValue | undefined>(
  undefined,
);

export function usePlanner(): PlannerContextValue {
  const value = useContext(PlannerContext);
  if (value === undefined) {
    throw new Error('usePlanner must be used inside a PlannerProvider.');
  }
  return value;
}

export function usePlannerState(): PlannerStoreState {
  return usePlanner().state;
}

export function usePlannerActions(): PlannerActions {
  return usePlanner().actions;
}
