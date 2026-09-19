import { describe, expect, it } from 'vitest';

import { savedPlanExample, savedPlanV0Example } from './examples';
import { decodeExport, encodeExport, migrateExport } from './import-export';

const activeConfig = {
  taxYear: '2026/27' as const,
  taxConfigVersion: '2026-27.1',
};

describe('export codec', () => {
  it('round-trips inputs and choices with reproducibility metadata only', () => {
    const encoded = encodeExport(
      savedPlanExample.plan,
      activeConfig.taxConfigVersion,
      new Date(savedPlanExample.exportedAt),
    );

    expect(decodeExport(encoded, activeConfig)).toEqual({
      kind: 'success',
      value: savedPlanExample,
    });
    const exported = JSON.parse(encoded) as { readonly plan: unknown };
    expect(exported).not.toHaveProperty('projection');
    expect(exported.plan).not.toHaveProperty('optimal');
  });

  it('rejects malformed JSON and hostile values without throwing', () => {
    expect(decodeExport('{')).toMatchObject({
      kind: 'failure',
      errors: [{ code: 'invalidJson' }],
    });
    expect(decodeExport(null)).toMatchObject({
      kind: 'failure',
      errors: [{ code: 'invalidSchema', path: 'export' }],
    });
    expect(() =>
      decodeExport(
        new Proxy(
          {},
          {
            ownKeys: () => {
              throw new Error('hostile');
            },
          },
        ),
      ),
    ).not.toThrow();
  });

  it('rejects derived fields, unsafe numbers, and inconsistent envelope tax years', () => {
    const withDerivedValue = structuredClone(
      savedPlanExample,
    ) as unknown as Record<string, unknown>;
    withDerivedValue.projection = {};

    const invalidMoney: { plan: { facts: { baseSalary: number } } } =
      structuredClone(savedPlanExample);
    invalidMoney.plan.facts.baseSalary = 1.5;

    const inconsistentTaxYear: { plan: { taxYear: string } } =
      structuredClone(savedPlanExample);
    inconsistentTaxYear.plan.taxYear = '2025/26';

    const derivedResult = decodeExport(withDerivedValue);
    const moneyResult = decodeExport(invalidMoney);
    const taxYearResult = decodeExport(inconsistentTaxYear);

    expect(derivedResult).toMatchObject({ kind: 'failure' });
    expect(
      derivedResult.kind === 'failure' && derivedResult.errors,
    ).toContainEqual(
      expect.objectContaining({
        code: 'invalidSchema',
        path: 'export.projection',
      }),
    );
    expect(moneyResult).toMatchObject({ kind: 'failure' });
    expect(moneyResult.kind === 'failure' && moneyResult.errors).toContainEqual(
      expect.objectContaining({
        code: 'invalidSchema',
        path: 'plan.facts.baseSalary',
      }),
    );
    expect(taxYearResult).toMatchObject({ kind: 'failure' });
    expect(
      taxYearResult.kind === 'failure' && taxYearResult.errors,
    ).toContainEqual(
      expect.objectContaining({
        code: 'unsupportedTaxYear',
        path: 'plan.taxYear',
      }),
    );
  });

  it('distinguishes unsupported versions from configuration mismatches', () => {
    expect(
      decodeExport({ ...savedPlanExample, schemaVersion: 99 }),
    ).toMatchObject({
      kind: 'failure',
      errors: [{ code: 'unsupportedSchemaVersion', path: 'schemaVersion' }],
    });
    expect(
      decodeExport(savedPlanExample, {
        ...activeConfig,
        taxConfigVersion: '2026-27.2',
      }),
    ).toMatchObject({
      kind: 'failure',
      errors: [{ code: 'taxConfigMismatch', path: 'taxConfigVersion' }],
    });
  });
});

describe('export migration', () => {
  it('migrates version 0 only when an active configuration supplies its missing version', () => {
    expect(migrateExport(savedPlanV0Example, activeConfig)).toEqual({
      kind: 'migrated',
      fromVersion: 0,
      value: savedPlanExample,
    });
  });

  it('fails migration safely when a legacy plan cannot be made reproducible', () => {
    expect(migrateExport(savedPlanV0Example)).toMatchObject({
      kind: 'failure',
      errors: [{ code: 'migrationFailed', path: 'taxConfigVersion' }],
    });
  });
});
