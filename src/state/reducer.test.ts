import { describe, expect, it } from 'vitest';

import type { PlannerState, ScenarioAllocation } from '../domain';
import { resolveTaxYear } from '../tax/config';

import {
  createPlannerStoreState,
  DEFAULT_PLANNER_PLAN,
  reducePlannerState,
} from './reducer';
import {
  selectPayeAvailability,
  selectResultsAreStale,
  selectScenarioViewModel,
} from './selectors';

const dependencies = { resolveTaxYear, curvePointCount: 6 };

const allocation = (
  overrides: Partial<ScenarioAllocation> = {},
): ScenarioAllocation => ({
  regularSalarySacrifice: 0,
  bonusSalarySacrifice: 0,
  sippNetContribution: 0,
  giftAidCashDonation: 0,
  ...overrides,
});

const plan = (overrides: Partial<PlannerState> = {}): PlannerState => ({
  ...DEFAULT_PLANNER_PLAN,
  facts: {
    ...DEFAULT_PLANNER_PLAN.facts,
    baseSalary: 12_000_000,
  },
  current: allocation(),
  alternative: allocation(),
  maxAdditionalRegularSalarySacrifice: 3_000_000,
  ...overrides,
});

describe('planner reducer', () => {
  it('starts with a zero cap and derives Current, Optimal, and Alternative', () => {
    const state = createPlannerStoreState(DEFAULT_PLANNER_PLAN, dependencies);

    expect(state.plan.maxAdditionalRegularSalarySacrifice).toBe(0);
    expect(state.derived.plan).toBe(state.plan);
    expect(selectScenarioViewModel(state, 'current').projection).toBe(
      state.derived.current.projection,
    );
    expect(selectScenarioViewModel(state, 'alternative').projection).toBe(
      state.derived.alternative.projection,
    );
  });

  it('keeps Alternative edits isolated and never provides an Optimal edit path', () => {
    const initial = createPlannerStoreState(plan(), dependencies);
    const next = reducePlannerState(
      initial,
      {
        type: 'updateAllocationField',
        scenario: 'alternative',
        field: 'regularSalarySacrifice',
        value: 1_000_000,
      },
      dependencies,
    );

    expect(next.plan.current.regularSalarySacrifice).toBe(0);
    expect(next.plan.alternative.regularSalarySacrifice).toBe(1_000_000);
    expect(next.derived.current.allocation).toEqual(next.plan.current);
    expect(selectScenarioViewModel(next, 'optimal').allocation).not.toBe(
      next.plan.alternative,
    );
  });

  it('retains the last valid derived result while an invalid draft exposes errors', () => {
    const initial = createPlannerStoreState(plan(), dependencies);
    const oldDerived = initial.derived;
    const invalid = reducePlannerState(
      initial,
      {
        type: 'updateAllocationField',
        scenario: 'current',
        field: 'regularSalarySacrifice',
        value: 12_000_001,
      },
      dependencies,
    );

    expect(invalid.plan.current.regularSalarySacrifice).toBe(12_000_001);
    expect(invalid.derived).toBe(oldDerived);
    expect(invalid.validationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'regularSacrificeExceedsSalary' }),
      ]),
    );
    expect(selectResultsAreStale(invalid)).toBe(true);
  });

  it('selects scenarios and resets Alternative from Current or derived Optimal', () => {
    const initial = createPlannerStoreState(plan(), dependencies);
    const changed = reducePlannerState(
      initial,
      {
        type: 'updateAllocation',
        scenario: 'alternative',
        allocation: allocation({ regularSalarySacrifice: 1_200_000 }),
      },
      dependencies,
    );
    const resetCurrent = reducePlannerState(
      changed,
      { type: 'resetAlternative', source: 'current' },
      dependencies,
    );
    const resetOptimal = reducePlannerState(
      resetCurrent,
      { type: 'resetAlternative', source: 'optimal' },
      dependencies,
    );
    const selected = reducePlannerState(
      resetOptimal,
      { type: 'selectScenario', scenario: 'optimal' },
      dependencies,
    );

    expect(resetCurrent.plan.alternative).toEqual(resetCurrent.plan.current);
    expect(resetOptimal.plan.alternative).toEqual(
      selectScenarioViewModel(resetCurrent, 'optimal').allocation,
    );
    expect(selected.selectedScenarioId).toBe('optimal');
  });

  it('recomputes PAYE availability when payroll facts become sufficient', () => {
    const initial = createPlannerStoreState(plan(), dependencies);
    expect(selectPayeAvailability(initial).kind).toBe('insufficientInputs');

    const supported = reducePlannerState(
      initial,
      {
        type: 'updateFacts',
        facts: {
          ...initial.plan.facts,
          payroll: {
            taxCode: '1257L',
            taxCodeBasis: 'cumulative',
            payFrequency: 'monthly',
          },
        },
      },
      dependencies,
    );

    expect(selectPayeAvailability(supported).kind).toBe('supported');
  });

  it('records theme and persistence actions without changing calculated data', () => {
    const initial = createPlannerStoreState(plan(), dependencies);
    const themed = reducePlannerState(
      initial,
      { type: 'setTheme', theme: 'dark' },
      dependencies,
    );
    const saved = reducePlannerState(
      themed,
      { type: 'persistenceResult', status: { kind: 'saved' } },
      dependencies,
    );

    expect(saved.theme).toBe('dark');
    expect(saved.persistence).toEqual({ kind: 'saved' });
    expect(saved.derived).toBe(initial.derived);
  });
});
