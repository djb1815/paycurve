import type { PlannerState, TaxYearId } from '../domain';

export const CURRENT_SCHEMA_VERSION = 1 as const;

export interface SavedPlanV1 {
  readonly schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  /** ISO 8601 timestamp created at the explicit export boundary. */
  readonly exportedAt: string;
  readonly taxYear: TaxYearId;
  readonly taxConfigVersion: string;
  readonly plan: PlannerState;
}

export type SavedPlan = SavedPlanV1;

export type ImportErrorCode =
  | 'invalidJson'
  | 'invalidSchema'
  | 'unsupportedSchemaVersion'
  | 'unsupportedTaxYear'
  | 'taxConfigMismatch'
  | 'migrationFailed';

export interface ImportError {
  readonly code: ImportErrorCode;
  readonly path?: string;
  readonly parameters: Readonly<Record<string, number | string>>;
}

export type ImportResult =
  | { readonly kind: 'success'; readonly value: SavedPlan }
  | { readonly kind: 'failure'; readonly errors: readonly ImportError[] };

export type MigrationResult =
  | { readonly kind: 'current'; readonly value: SavedPlan }
  | {
      readonly kind: 'migrated';
      readonly value: SavedPlan;
      readonly fromVersion: number;
    }
  | { readonly kind: 'failure'; readonly errors: readonly ImportError[] };

export type EncodeExport = (
  plan: PlannerState,
  taxConfigVersion: string,
  exportedAt?: Date,
) => string;

export interface TaxConfigIdentity {
  readonly taxYear: TaxYearId;
  readonly taxConfigVersion: string;
}

export type DecodeExport = (
  input: unknown,
  expectedConfig?: TaxConfigIdentity,
) => ImportResult;

export type MigrateExport = (
  input: unknown,
  expectedConfig?: TaxConfigIdentity,
) => MigrationResult;
