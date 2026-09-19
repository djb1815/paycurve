import { describe, expect, it } from 'vitest';

import { savedPlanExample } from './examples';
import { createLocalPlanStorage, type StorageLike } from './local-storage';

const config = { taxYear: '2026/27' as const, taxConfigVersion: '2026-27.1' };

const createMemoryStorage = (): StorageLike & { value: string | null } => ({
  value: null,
  getItem() {
    return this.value;
  },
  setItem(_key, value) {
    this.value = value;
  },
  removeItem() {
    this.value = null;
  },
});

describe('local plan storage', () => {
  it('saves and loads a browser-local export through an injected storage interface', () => {
    const memory = createMemoryStorage();
    const plans = createLocalPlanStorage(memory);

    expect(
      plans.save(
        savedPlanExample.plan,
        config,
        new Date(savedPlanExample.exportedAt),
      ),
    ).toEqual({ kind: 'saved' });
    expect(plans.load(config)).toEqual({
      kind: 'loaded',
      value: savedPlanExample,
    });
  });

  it('reports corrupt data without pre-emptively overwriting it', () => {
    const memory = createMemoryStorage();
    memory.value = '{not valid JSON';
    const plans = createLocalPlanStorage(memory);

    expect(plans.load(config)).toMatchObject({
      kind: 'corruptData',
      errors: [{ code: 'invalidJson' }],
    });
    expect(memory.value).toBe('{not valid JSON');
  });

  it('turns storage exceptions into recoverable operation failures', () => {
    const unavailable: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const plans = createLocalPlanStorage(unavailable);

    expect(plans.load(config)).toMatchObject({
      kind: 'storageFailure',
      operation: 'read',
    });
    expect(plans.save(savedPlanExample.plan, config)).toMatchObject({
      kind: 'storageFailure',
      operation: 'write',
    });
    expect(plans.remove()).toMatchObject({
      kind: 'storageFailure',
      operation: 'remove',
    });
  });
});
