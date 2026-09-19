import type { PlannerState } from '../domain';

import type { ImportError, SavedPlan, TaxConfigIdentity } from './contracts';
import { decodeExport, encodeExport } from './import-export';

/** Structural browser Storage type so tests and non-browser consumers can inject an adapter. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageFailure =
  | {
      readonly kind: 'storageFailure';
      readonly operation: 'read' | 'write' | 'remove';
      readonly error: unknown;
    }
  | {
      readonly kind: 'corruptData';
      readonly errors: readonly ImportError[];
    };

export type LoadPlanResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'loaded'; readonly value: SavedPlan }
  | StorageFailure;

export type SavePlanResult =
  | { readonly kind: 'saved' }
  | Extract<StorageFailure, { readonly kind: 'storageFailure' }>;

export type RemovePlanResult =
  | { readonly kind: 'removed' }
  | Extract<StorageFailure, { readonly kind: 'storageFailure' }>;

export interface LocalPlanStorage {
  readonly load: (expectedConfig?: TaxConfigIdentity) => LoadPlanResult;
  readonly save: (
    plan: PlannerState,
    config: TaxConfigIdentity,
    exportedAt?: Date,
  ) => SavePlanResult;
  readonly remove: () => RemovePlanResult;
}

/**
 * Browser-local plan storage. A bad existing value is never overwritten during load:
 * callers can surface recovery UI and only replace it after an explicit save/import.
 */
export const createLocalPlanStorage = (
  storage: StorageLike,
  key = 'paycurve.plan.v1',
): LocalPlanStorage => ({
  load: (expectedConfig) => {
    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch (storageError) {
      return { kind: 'storageFailure', operation: 'read', error: storageError };
    }
    if (raw === null) {
      return { kind: 'missing' };
    }

    const decoded = decodeExport(raw, expectedConfig);
    return decoded.kind === 'success'
      ? { kind: 'loaded', value: decoded.value }
      : { kind: 'corruptData', errors: decoded.errors };
  },
  save: (plan, config, exportedAt) => {
    try {
      storage.setItem(
        key,
        encodeExport(plan, config.taxConfigVersion, exportedAt),
      );
      return { kind: 'saved' };
    } catch (storageError) {
      return {
        kind: 'storageFailure',
        operation: 'write',
        error: storageError,
      };
    }
  },
  remove: () => {
    try {
      storage.removeItem(key);
      return { kind: 'removed' };
    } catch (storageError) {
      return {
        kind: 'storageFailure',
        operation: 'remove',
        error: storageError,
      };
    }
  },
});
