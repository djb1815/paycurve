import type { PlannerState } from '../domain';

import {
  CURRENT_SCHEMA_VERSION,
  type DecodeExport,
  type EncodeExport,
  type ImportError,
  type MigrateExport,
  type MigrationResult,
  type SavedPlan,
  type TaxConfigIdentity,
} from './contracts';
import { validatePlannerState, validateSavedPlan } from './schema';

const failure = (...errors: readonly ImportError[]): MigrationResult => ({
  kind: 'failure',
  errors,
});

const error = (
  code: ImportError['code'],
  path?: string,
  parameters: Readonly<Record<string, number | string>> = {},
): ImportError => ({
  code,
  ...(path === undefined ? {} : { path }),
  parameters,
});

const parseInput = (
  input: unknown,
):
  { readonly value: unknown } | { readonly errors: readonly ImportError[] } => {
  if (typeof input !== 'string') {
    return { value: input };
  }

  try {
    return { value: JSON.parse(input) as unknown };
  } catch {
    return {
      errors: [error('invalidJson', undefined, { reason: 'parseFailed' })],
    };
  }
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const migrateV0 = (
  value: Readonly<Record<string, unknown>>,
  expectedConfig?: TaxConfigIdentity,
): MigrationResult => {
  const allowedKeys = new Set([
    'schemaVersion',
    'exportedAt',
    'taxYear',
    'plan',
  ]);
  const unexpectedKey = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unexpectedKey !== undefined) {
    return failure(
      error('migrationFailed', `export.${unexpectedKey}`, {
        reason: 'unexpectedLegacyProperty',
      }),
    );
  }
  if (expectedConfig === undefined) {
    return failure(
      error('migrationFailed', 'taxConfigVersion', {
        reason: 'legacyExportRequiresExpectedConfig',
      }),
    );
  }
  if (value.taxYear !== expectedConfig.taxYear) {
    return failure(
      error('taxConfigMismatch', 'taxYear', {
        expectedTaxYear: expectedConfig.taxYear,
        importedTaxYear: String(value.taxYear),
      }),
    );
  }

  const planErrors = validatePlannerState(value.plan);
  if (planErrors.length > 0) {
    return failure(
      ...planErrors.map((item) => ({
        ...item,
        code: 'migrationFailed' as const,
      })),
    );
  }

  const migrated = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: value.exportedAt,
    taxYear: value.taxYear,
    taxConfigVersion: expectedConfig.taxConfigVersion,
    plan: value.plan,
  };
  const validation = validateSavedPlan(migrated, expectedConfig);
  return 'errors' in validation
    ? failure(
        ...validation.errors.map((item) => ({
          ...item,
          code: 'migrationFailed' as const,
        })),
      )
    : { kind: 'migrated', value: validation.value, fromVersion: 0 };
};

/**
 * Migrate a parsed export or JSON string. Version 0 was the pre-config envelope;
 * its missing tax configuration is filled only from an explicitly supplied config.
 */
export const migrateExport: MigrateExport = (input, expectedConfig) => {
  try {
    const parsed = parseInput(input);
    if ('errors' in parsed) {
      return failure(...parsed.errors);
    }
    if (!isRecord(parsed.value)) {
      return failure(error('invalidSchema', 'export', { expected: 'object' }));
    }

    const version = parsed.value.schemaVersion;
    if (version === CURRENT_SCHEMA_VERSION) {
      const validation = validateSavedPlan(parsed.value, expectedConfig);
      return 'errors' in validation
        ? failure(...validation.errors)
        : { kind: 'current', value: validation.value };
    }
    if (version === 0) {
      return migrateV0(parsed.value, expectedConfig);
    }
    if (typeof version !== 'number' || !Number.isSafeInteger(version)) {
      return failure(
        error('invalidSchema', 'schemaVersion', { expected: 'integer' }),
      );
    }
    return failure(
      error('unsupportedSchemaVersion', 'schemaVersion', {
        supported: CURRENT_SCHEMA_VERSION,
        received: version,
      }),
    );
  } catch {
    return failure(
      error('invalidSchema', 'export', { reason: 'unreadableValue' }),
    );
  }
};

/** Decode untrusted import input without throwing. Earlier supported versions migrate first. */
export const decodeExport: DecodeExport = (input, expectedConfig) => {
  const migration = migrateExport(input, expectedConfig);
  return migration.kind === 'failure'
    ? { kind: 'failure', errors: migration.errors }
    : { kind: 'success', value: migration.value };
};

const copyPlan = (plan: PlannerState): PlannerState => ({
  taxYear: plan.taxYear,
  targetAni: plan.targetAni,
  maxAdditionalRegularSalarySacrifice: plan.maxAdditionalRegularSalarySacrifice,
  facts: {
    baseSalary: plan.facts.baseSalary,
    bonus: {
      guidePercentage: plan.facts.bonus.guidePercentage,
      ...(plan.facts.bonus.amountOverride === undefined
        ? {}
        : { amountOverride: { ...plan.facts.bonus.amountOverride } }),
    },
    equityIncome: plan.facts.equityIncome.map((income) => ({ ...income })),
    taxableBenefits: { ...plan.facts.taxableBenefits },
    savingsInterest: { ...plan.facts.savingsInterest },
    otherTaxableIncome: plan.facts.otherTaxableIncome,
    employerPensionContribution: plan.facts.employerPensionContribution,
    ...(plan.facts.payroll === undefined
      ? {}
      : {
          payroll: {
            ...plan.facts.payroll,
            ...(plan.facts.payroll.yearToDate === undefined
              ? {}
              : { yearToDate: { ...plan.facts.payroll.yearToDate } }),
          },
        }),
  },
  current: { ...plan.current },
  alternative: { ...plan.alternative },
});

/** Serialize only planner inputs and choices; derived calculations are deliberately excluded. */
export const encodeExport: EncodeExport = (
  plan,
  taxConfigVersion,
  exportedAt = new Date(),
) =>
  JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    taxYear: plan.taxYear,
    taxConfigVersion,
    plan: copyPlan(plan),
  } satisfies SavedPlan);
