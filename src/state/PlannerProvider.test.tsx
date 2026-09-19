import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PlannerState } from '../domain';
import { createLocalPlanStorage, encodeExport } from '../persistence';
import type { StorageLike } from '../persistence';
import { resolveTaxYear } from '../tax/config';

import { PlannerProvider } from './PlannerProvider';
import { usePlanner } from './context';
import { DEFAULT_PLANNER_PLAN } from './reducer';
import type { PlannerContextValue } from './types';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const plan = (): PlannerState => ({
  ...DEFAULT_PLANNER_PLAN,
  facts: { ...DEFAULT_PLANNER_PLAN.facts, baseSalary: 12_000_000 },
  maxAdditionalRegularSalarySacrifice: 3_000_000,
});

function Capture({
  onValue,
}: {
  readonly onValue: (value: PlannerContextValue) => void;
}) {
  onValue(usePlanner());
  return null;
}

describe('PlannerProvider', () => {
  it('validates imports before replacement and exports inputs only', () => {
    let value: PlannerContextValue | undefined;
    render(
      <PlannerProvider initialPlan={plan()}>
        <Capture
          onValue={(next) => {
            value = next;
          }}
        />
      </PlannerProvider>,
    );
    if (value === undefined) throw new Error('Provider did not render.');
    const originalPlan = value.state.plan;

    act(() => {
      expect(value?.actions.importJson('{not json')).toBe(false);
    });
    expect(value.state.plan).toBe(originalPlan);
    expect(value.state.importStatus.kind).toBe('failure');

    const imported = { ...plan(), targetAni: 9_900_000 };
    act(() => {
      expect(
        value?.actions.importJson(
          encodeExport(imported, resolveTaxYear('2026/27').version),
        ),
      ).toBe(true);
    });
    expect(value.state.plan.targetAni).toBe(9_900_000);
    expect(value.actions.exportJson()).not.toContain('"derived"');
    expect(value.actions.exportJson()).not.toContain('"optimal"');
  });

  it('persists valid edits, applies explicit theme preferences, and survives storage errors', async () => {
    const storage = new MemoryStorage();
    let value: PlannerContextValue | undefined;
    render(
      <PlannerProvider
        initialPlan={plan()}
        storage={createLocalPlanStorage(storage)}
        themeStorage={storage}
      >
        <Capture
          onValue={(next) => {
            value = next;
          }}
        />
      </PlannerProvider>,
    );
    if (value === undefined) throw new Error('Provider did not render.');

    act(() => {
      value?.actions.setTheme('dark');
      value?.actions.updatePlanField('targetAni', 9_800_000);
    });
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(storage.getItem('paycurve.theme.v1')).toBe('dark');
    });
    expect(value.state.persistence.kind).toBe('saved');
    expect(storage.getItem('paycurve.plan.v1')).toContain('9800000');
  });

  it('keeps the draft usable when local storage writes fail', async () => {
    const failure = new Error('quota exceeded');
    const brokenStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw failure;
      },
      removeItem: () => undefined,
    };
    let value: PlannerContextValue | undefined;
    render(
      <PlannerProvider
        initialPlan={plan()}
        storage={createLocalPlanStorage(brokenStorage)}
        themeStorage={brokenStorage}
      >
        <Capture
          onValue={(next) => {
            value = next;
          }}
        />
      </PlannerProvider>,
    );
    if (value === undefined) throw new Error('Provider did not render.');

    act(() => {
      value?.actions.updatePlanField('targetAni', 9_700_000);
    });
    await waitFor(() => {
      expect(value?.state.persistence.kind).toBe('failure');
    });
    expect(value.state.plan.targetAni).toBe(9_700_000);
    expect(value.state.persistence).toMatchObject({
      kind: 'failure',
      failure: { kind: 'storageFailure', operation: 'write' },
    });
  });
});
