import type { PlannerState, TaxYearId } from '../domain';

import {
  CURRENT_SCHEMA_VERSION,
  type ImportError,
  type SavedPlan,
  type TaxConfigIdentity,
} from './contracts';

type UnknownRecord = Readonly<Record<string, unknown>>;

const supportedTaxYears = new Set<TaxYearId>(['2026/27']);

const error = (
  code: ImportError['code'],
  path?: string,
  parameters: Readonly<Record<string, number | string>> = {},
): ImportError => ({
  code,
  ...(path === undefined ? {} : { path }),
  parameters,
});

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: UnknownRecord,
  allowedKeys: readonly string[],
  path: string,
): readonly ImportError[] => {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));

  return unexpected === undefined
    ? []
    : [
        error('invalidSchema', `${path}.${unexpected}`, {
          reason: 'unexpectedProperty',
        }),
      ];
};

const requireRecord = (
  value: unknown,
  path: string,
):
  | { readonly value: UnknownRecord }
  | { readonly errors: readonly ImportError[] } =>
  isRecord(value)
    ? { value }
    : { errors: [error('invalidSchema', path, { expected: 'object' })] };

const integerMoney = (value: unknown, path: string): readonly ImportError[] =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? []
    : [error('invalidSchema', path, { expected: 'nonNegativeIntegerPence' })];

const stringValue = (value: unknown, path: string): readonly ImportError[] =>
  typeof value === 'string' && value.trim().length > 0
    ? []
    : [error('invalidSchema', path, { expected: 'nonEmptyString' })];

const knownCertainty = (
  value: unknown,
  path: string,
): readonly ImportError[] =>
  value === 'actual' || value === 'forecast'
    ? []
    : [error('invalidSchema', path, { expected: 'actualOrForecast' })];

const optionalIsoDate = (
  value: unknown,
  path: string,
): readonly ImportError[] => {
  if (value === undefined) {
    return [];
  }

  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value) &&
    !Number.isNaN(Date.parse(value))
    ? []
    : [error('invalidSchema', path, { expected: 'isoDate' })];
};

const exportedAt = (value: unknown): readonly ImportError[] =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
  !Number.isNaN(Date.parse(value))
    ? []
    : [error('invalidSchema', 'exportedAt', { expected: 'isoTimestamp' })];

const validateEstimatedAmount = (
  value: unknown,
  path: string,
): readonly ImportError[] => {
  const record = requireRecord(value, path);
  if ('errors' in record) {
    return record.errors;
  }

  return [
    ...hasOnlyKeys(record.value, ['amount', 'certainty'], path),
    ...integerMoney(record.value.amount, `${path}.amount`),
    ...knownCertainty(record.value.certainty, `${path}.certainty`),
  ];
};

const validateAllocation = (
  value: unknown,
  path: string,
): readonly ImportError[] => {
  const record = requireRecord(value, path);
  if ('errors' in record) {
    return record.errors;
  }

  const keys = [
    'regularSalarySacrifice',
    'bonusSalarySacrifice',
    'sippNetContribution',
    'giftAidCashDonation',
  ] as const;

  return [
    ...hasOnlyKeys(record.value, keys, path),
    ...keys.flatMap((key) => integerMoney(record.value[key], `${path}.${key}`)),
  ];
};

const validatePayroll = (
  value: unknown,
  path: string,
): readonly ImportError[] => {
  if (value === undefined) {
    return [];
  }

  const record = requireRecord(value, path);
  if ('errors' in record) {
    return record.errors;
  }

  const errors = [
    ...hasOnlyKeys(
      record.value,
      [
        'taxCode',
        'taxCodeBasis',
        'payFrequency',
        'nextPeriodAdditionalGrossPay',
        'yearToDate',
      ],
      path,
    ),
    ...stringValue(record.value.taxCode, `${path}.taxCode`),
  ];

  if (
    record.value.taxCodeBasis !== 'cumulative' &&
    record.value.taxCodeBasis !== 'month1Week1'
  ) {
    errors.push(
      error('invalidSchema', `${path}.taxCodeBasis`, {
        expected: 'taxCodeBasis',
      }),
    );
  }

  if (
    !['monthly', 'fourWeekly', 'fortnightly', 'weekly'].includes(
      String(record.value.payFrequency),
    )
  ) {
    errors.push(
      error('invalidSchema', `${path}.payFrequency`, {
        expected: 'payFrequency',
      }),
    );
  }

  if (record.value.nextPeriodAdditionalGrossPay !== undefined) {
    errors.push(
      ...integerMoney(
        record.value.nextPeriodAdditionalGrossPay,
        `${path}.nextPeriodAdditionalGrossPay`,
      ),
    );
  }

  if (record.value.yearToDate !== undefined) {
    const yearToDate = requireRecord(
      record.value.yearToDate,
      `${path}.yearToDate`,
    );
    if ('errors' in yearToDate) {
      errors.push(...yearToDate.errors);
    } else {
      errors.push(
        ...hasOnlyKeys(
          yearToDate.value,
          ['completedPeriods', 'taxablePay', 'incomeTaxPaid'],
          `${path}.yearToDate`,
        ),
      );
      const completedPeriods = yearToDate.value.completedPeriods;
      if (
        typeof completedPeriods !== 'number' ||
        !Number.isSafeInteger(completedPeriods) ||
        completedPeriods < 0
      ) {
        errors.push(
          error('invalidSchema', `${path}.yearToDate.completedPeriods`, {
            expected: 'nonNegativeInteger',
          }),
        );
      }
      errors.push(
        ...integerMoney(
          yearToDate.value.taxablePay,
          `${path}.yearToDate.taxablePay`,
        ),
        ...integerMoney(
          yearToDate.value.incomeTaxPaid,
          `${path}.yearToDate.incomeTaxPaid`,
        ),
      );
    }
  }

  return errors;
};

const validateFacts = (
  value: unknown,
  path: string,
): readonly ImportError[] => {
  const record = requireRecord(value, path);
  if ('errors' in record) {
    return record.errors;
  }

  const errors = [
    ...hasOnlyKeys(
      record.value,
      [
        'baseSalary',
        'bonus',
        'equityIncome',
        'taxableBenefits',
        'savingsInterest',
        'otherTaxableIncome',
        'employerPensionContribution',
        'payroll',
      ],
      path,
    ),
    ...integerMoney(record.value.baseSalary, `${path}.baseSalary`),
    ...integerMoney(
      record.value.otherTaxableIncome,
      `${path}.otherTaxableIncome`,
    ),
    ...integerMoney(
      record.value.employerPensionContribution,
      `${path}.employerPensionContribution`,
    ),
    ...validateEstimatedAmount(
      record.value.taxableBenefits,
      `${path}.taxableBenefits`,
    ),
    ...validateEstimatedAmount(
      record.value.savingsInterest,
      `${path}.savingsInterest`,
    ),
    ...validatePayroll(record.value.payroll, `${path}.payroll`),
  ];

  const bonus = requireRecord(record.value.bonus, `${path}.bonus`);
  if ('errors' in bonus) {
    errors.push(...bonus.errors);
  } else {
    errors.push(
      ...hasOnlyKeys(
        bonus.value,
        ['guidePercentage', 'amountOverride'],
        `${path}.bonus`,
      ),
    );
    const guidePercentage = bonus.value.guidePercentage;
    if (
      typeof guidePercentage !== 'number' ||
      !Number.isSafeInteger(guidePercentage) ||
      guidePercentage < 0
    ) {
      errors.push(
        error('invalidSchema', `${path}.bonus.guidePercentage`, {
          expected: 'nonNegativeIntegerBasisPoints',
        }),
      );
    }
    if (bonus.value.amountOverride !== undefined) {
      errors.push(
        ...validateEstimatedAmount(
          bonus.value.amountOverride,
          `${path}.bonus.amountOverride`,
        ),
      );
    }
  }

  if (!Array.isArray(record.value.equityIncome)) {
    errors.push(
      error('invalidSchema', `${path}.equityIncome`, { expected: 'array' }),
    );
  } else {
    record.value.equityIncome.forEach((equity, index) => {
      const equityPath = `${path}.equityIncome.${index}`;
      const item = requireRecord(equity, equityPath);
      if ('errors' in item) {
        errors.push(...item.errors);
        return;
      }
      errors.push(
        ...hasOnlyKeys(
          item.value,
          ['id', 'label', 'vestDate', 'amount', 'certainty'],
          equityPath,
        ),
      );
      errors.push(...stringValue(item.value.id, `${equityPath}.id`));
      if (item.value.label !== undefined) {
        errors.push(...stringValue(item.value.label, `${equityPath}.label`));
      }
      errors.push(
        ...optionalIsoDate(item.value.vestDate, `${equityPath}.vestDate`),
      );
      errors.push(...integerMoney(item.value.amount, `${equityPath}.amount`));
      errors.push(
        ...knownCertainty(item.value.certainty, `${equityPath}.certainty`),
      );
    });
  }

  return errors;
};

export const validatePlannerState = (
  value: unknown,
): readonly ImportError[] => {
  const record = requireRecord(value, 'plan');
  if ('errors' in record) {
    return record.errors;
  }

  const errors = [
    ...hasOnlyKeys(
      record.value,
      [
        'taxYear',
        'targetAni',
        'maxAdditionalRegularSalarySacrifice',
        'facts',
        'current',
        'alternative',
      ],
      'plan',
    ),
    ...integerMoney(record.value.targetAni, 'plan.targetAni'),
    ...integerMoney(
      record.value.maxAdditionalRegularSalarySacrifice,
      'plan.maxAdditionalRegularSalarySacrifice',
    ),
    ...validateFacts(record.value.facts, 'plan.facts'),
    ...validateAllocation(record.value.current, 'plan.current'),
    ...validateAllocation(record.value.alternative, 'plan.alternative'),
  ];

  if (!supportedTaxYears.has(record.value.taxYear as TaxYearId)) {
    errors.push(
      error('unsupportedTaxYear', 'plan.taxYear', {
        value: String(record.value.taxYear),
      }),
    );
  }

  return errors;
};

export const validateSavedPlan = (
  value: unknown,
  expectedConfig?: TaxConfigIdentity,
):
  | { readonly value: SavedPlan }
  | { readonly errors: readonly ImportError[] } => {
  const record = requireRecord(value, 'export');
  if ('errors' in record) {
    return record;
  }

  const errors = [
    ...hasOnlyKeys(
      record.value,
      ['schemaVersion', 'exportedAt', 'taxYear', 'taxConfigVersion', 'plan'],
      'export',
    ),
    ...exportedAt(record.value.exportedAt),
    ...stringValue(record.value.taxConfigVersion, 'taxConfigVersion'),
    ...validatePlannerState(record.value.plan),
  ];

  if (record.value.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    errors.push(
      error('invalidSchema', 'schemaVersion', {
        expected: CURRENT_SCHEMA_VERSION,
      }),
    );
  }
  if (!supportedTaxYears.has(record.value.taxYear as TaxYearId)) {
    errors.push(
      error('unsupportedTaxYear', 'taxYear', {
        value: String(record.value.taxYear),
      }),
    );
  }
  if (
    isRecord(record.value.plan) &&
    record.value.taxYear !== record.value.plan.taxYear
  ) {
    errors.push(
      error('invalidSchema', 'taxYear', { reason: 'doesNotMatchPlanTaxYear' }),
    );
  }
  if (
    expectedConfig !== undefined &&
    (record.value.taxYear !== expectedConfig.taxYear ||
      record.value.taxConfigVersion !== expectedConfig.taxConfigVersion)
  ) {
    errors.push(
      error('taxConfigMismatch', 'taxConfigVersion', {
        expectedTaxYear: expectedConfig.taxYear,
        expectedVersion: expectedConfig.taxConfigVersion,
        importedTaxYear: String(record.value.taxYear),
        importedVersion: String(record.value.taxConfigVersion),
      }),
    );
  }

  return errors.length === 0 ? { value: value as SavedPlan } : { errors };
};

export const asPlannerState = (value: unknown): PlannerState =>
  value as PlannerState;
