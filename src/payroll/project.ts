import type { MoneyPence } from '../domain/money';
import type {
  PayFrequency,
  PayrollInputs,
  PlanFacts,
  ScenarioAllocation,
  TaxCodeBasis,
} from '../domain/plan';
import type {
  NationalInsuranceBand,
  TaxBand,
  TaxYearConfig,
} from '../tax/config/types';

export interface PayeProjectionRequest {
  readonly config: TaxYearConfig;
  readonly facts: PlanFacts;
  readonly allocation: ScenarioAllocation;
}

export type PayrollAvailabilityReasonCode =
  | 'missingPayrollInputs'
  | 'missingTaxCode'
  | 'unsupportedTaxCode'
  | 'contradictoryTaxCodeBasis'
  | 'invalidPayrollYearToDate'
  | 'invalidAmount'
  | 'invalidAllocation'
  | 'invalidTaxConfiguration'
  | 'bonusSacrificeNotAssignableToNextPeriod';

export interface PayrollAvailabilityReason {
  readonly code: PayrollAvailabilityReasonCode;
  readonly path?: string;
  readonly parameters: Readonly<Record<string, number>>;
}

export type PayrollAssumptionCode =
  | 'periodPayDerivedFromAnnualSalary'
  | 'regularSacrificeApportionedEvenly'
  | 'bonusSacrificeAppliedToNextPeriod'
  | 'taxBandsAndCodeAllowancesApportionedByFrequency'
  | 'nationalInsuranceThresholdsAnnualised'
  | 'kCodeDeductionCappedAtHalfPay'
  | 'yearToDateUnavailable'
  | 'yearToDateIgnoredForNonCumulativeBasis'
  | 'otherPayrollDeductionsNotModelled';

export interface PayrollAssumption {
  readonly code: PayrollAssumptionCode;
  readonly parameters: Readonly<Record<string, number>>;
}

export interface ParsedTaxCode {
  readonly code: string;
  readonly kind: 'allowance' | 'kCode' | 'zeroAllowance' | 'flatRate' | 'noTax';
  readonly annualAllowance: MoneyPence;
  readonly annualAdjustment: MoneyPence;
  readonly flatRate?: number;
}

export interface PayePeriodProjection {
  /** One-based period in the selected tax-year pay frequency. */
  readonly period: number;
  readonly grossPay: MoneyPence;
  readonly pensionSalarySacrifice: MoneyPence;
  readonly taxablePay: MoneyPence;
  /** A negative amount is a projected PAYE refund. */
  readonly incomeTax: MoneyPence;
  readonly employeeNationalInsurance: MoneyPence;
  readonly netEmploymentPay: MoneyPence;
}

export interface SupportedPayeProjection {
  readonly kind: 'supported';
  readonly frequency: PayFrequency;
  readonly taxCode: ParsedTaxCode;
  readonly nextPeriod: PayePeriodProjection;
  readonly assumptions: readonly PayrollAssumption[];
}

export interface InsufficientPayrollInputs {
  readonly kind: 'insufficientInputs';
  readonly reasons: readonly PayrollAvailabilityReason[];
}

export interface InvalidOrUnsupportedPayeProjection {
  readonly kind: 'invalidOrUnsupported';
  readonly reasons: readonly PayrollAvailabilityReason[];
}

export type PayeProjectionResult =
  | SupportedPayeProjection
  | InsufficientPayrollInputs
  | InvalidOrUnsupportedPayeProjection;

interface ParsedCodeSuccess {
  readonly kind: 'success';
  readonly code: ParsedTaxCode;
  readonly basisFromCode?: TaxCodeBasis;
}

interface ParsedCodeFailure {
  readonly kind: 'failure';
  readonly reason: PayrollAvailabilityReason;
}

type ParsedCode = ParsedCodeSuccess | ParsedCodeFailure;

const EMPTY_PARAMETERS: Readonly<Record<string, number>> = {};

const periodsForFrequency: Readonly<Record<PayFrequency, number>> = {
  monthly: 12,
  fourWeekly: 13,
  fortnightly: 26,
  weekly: 52,
};

const isNonNegativeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

const roundDivide = (numerator: number, denominator: number): number =>
  Math.floor((numerator + Math.floor(denominator / 2)) / denominator);

const ceilDivide = (numerator: number, denominator: number): number =>
  Math.ceil(numerator / denominator);

const calculateAtRate = (amount: MoneyPence, rate: number): MoneyPence =>
  roundDivide(amount * rate, 10_000);

const calculateBandedTax = (
  taxableAmount: MoneyPence,
  bands: readonly TaxBand[],
  periodsCovered: number,
  periodsPerYear: number,
): MoneyPence => {
  let remaining = Math.max(0, taxableAmount);
  let tax = 0;

  for (const band of bands) {
    if (remaining === 0) {
      break;
    }

    const width =
      band.width === null
        ? remaining
        : Math.min(
            remaining,
            roundDivide(band.width * periodsCovered, periodsPerYear),
          );
    tax += calculateAtRate(width, band.rate);
    remaining -= width;
  }

  return tax;
};

const calculateNationalInsurance = (
  taxablePay: MoneyPence,
  bands: readonly NationalInsuranceBand[],
  periodsPerYear: number,
): MoneyPence => {
  let nationalInsurance = 0;

  for (const band of bands) {
    const lowerBound = ceilDivide(band.lowerBound, periodsPerYear);
    const upperBound =
      band.upperBound === null
        ? taxablePay
        : ceilDivide(band.upperBound, periodsPerYear);
    const bandPay = Math.max(0, Math.min(taxablePay, upperBound) - lowerBound);
    nationalInsurance += calculateAtRate(bandPay, band.rate);
  }

  return nationalInsurance;
};

const parseTaxCode = (value: string, config: TaxYearConfig): ParsedCode => {
  const codeWithBasis = value.trim().toUpperCase().replaceAll(/\s+/g, '');
  const basisMatch = codeWithBasis.match(/(M1|W1|X)$/);
  const basisFromCode = basisMatch === null ? undefined : 'month1Week1';
  const code =
    basisMatch === null
      ? codeWithBasis
      : codeWithBasis.slice(0, -basisMatch[0].length);

  if (code.length === 0) {
    return {
      kind: 'failure',
      reason: { code: 'missingTaxCode', parameters: EMPTY_PARAMETERS },
    };
  }

  if (code.startsWith('S')) {
    return {
      kind: 'failure',
      reason: { code: 'unsupportedTaxCode', parameters: EMPTY_PARAMETERS },
    };
  }

  const normalCode = code.replace(/^C/, '');
  const allowanceMatch = normalCode.match(/^(\d{1,4})[LMNT]$/);
  if (allowanceMatch !== null) {
    return {
      kind: 'success',
      code: {
        code,
        kind: 'allowance',
        annualAllowance: Number(allowanceMatch[1]) * 1_000,
        annualAdjustment: 0,
      },
      ...(basisFromCode === undefined ? {} : { basisFromCode }),
    };
  }

  const kCodeMatch = normalCode.match(/^K(\d{1,4})$/);
  if (kCodeMatch !== null) {
    return {
      kind: 'success',
      code: {
        code,
        kind: 'kCode',
        annualAllowance: 0,
        annualAdjustment: Number(kCodeMatch[1]) * 1_000,
      },
      ...(basisFromCode === undefined ? {} : { basisFromCode }),
    };
  }

  if (normalCode === '0T') {
    return {
      kind: 'success',
      code: {
        code,
        kind: 'zeroAllowance',
        annualAllowance: 0,
        annualAdjustment: 0,
      },
      ...(basisFromCode === undefined ? {} : { basisFromCode }),
    };
  }

  if (normalCode === 'NT') {
    return {
      kind: 'success',
      code: { code, kind: 'noTax', annualAllowance: 0, annualAdjustment: 0 },
      ...(basisFromCode === undefined ? {} : { basisFromCode }),
    };
  }

  const flatCodeIndex = ({ BR: 0, D0: 1, D1: 2 } as const)[
    normalCode as 'BR' | 'D0' | 'D1'
  ];
  if (flatCodeIndex !== undefined) {
    const band = config.incomeTaxBands[flatCodeIndex];
    if (band === undefined) {
      return {
        kind: 'failure',
        reason: {
          code: 'invalidTaxConfiguration',
          parameters: EMPTY_PARAMETERS,
        },
      };
    }
    return {
      kind: 'success',
      code: {
        code,
        kind: 'flatRate',
        annualAllowance: 0,
        annualAdjustment: 0,
        flatRate: band.rate,
      },
      ...(basisFromCode === undefined ? {} : { basisFromCode }),
    };
  }

  return {
    kind: 'failure',
    reason: { code: 'unsupportedTaxCode', parameters: EMPTY_PARAMETERS },
  };
};

const hasValidConfig = (config: TaxYearConfig): boolean => {
  const validRate = (rate: number): boolean =>
    Number.isInteger(rate) && rate >= 0 && rate <= 10_000;
  const validBands = config.incomeTaxBands.every(
    (band) =>
      validRate(band.rate) &&
      (band.width === null ||
        (isNonNegativeInteger(band.width) && band.width > 0)),
  );
  const validNationalInsuranceBands =
    config.nationalInsurance.class1EmployeeBands.every(
      (band) =>
        isNonNegativeInteger(band.lowerBound) &&
        (band.upperBound === null || band.upperBound >= band.lowerBound) &&
        validRate(band.rate),
    );

  return (
    validBands &&
    validNationalInsuranceBands &&
    config.incomeTaxBands.length > 0 &&
    config.nationalInsurance.class1EmployeeBands.length > 0
  );
};

const validateInputs = (
  facts: PlanFacts,
  allocation: ScenarioAllocation,
  payroll: PayrollInputs,
  periodsPerYear: number,
): readonly PayrollAvailabilityReason[] => {
  const reasons: PayrollAvailabilityReason[] = [];
  const nextPeriodAdditionalGrossPay =
    payroll.nextPeriodAdditionalGrossPay ?? 0;
  const amounts: readonly [string, number][] = [
    ['facts.baseSalary', facts.baseSalary],
    ['allocation.regularSalarySacrifice', allocation.regularSalarySacrifice],
    ['allocation.bonusSalarySacrifice', allocation.bonusSalarySacrifice],
    [
      'facts.payroll.nextPeriodAdditionalGrossPay',
      nextPeriodAdditionalGrossPay,
    ],
  ];

  for (const [path, amount] of amounts) {
    if (!isNonNegativeInteger(amount)) {
      reasons.push({ code: 'invalidAmount', path, parameters: { amount } });
    }
  }

  if (allocation.regularSalarySacrifice > facts.baseSalary) {
    reasons.push({
      code: 'invalidAllocation',
      path: 'allocation.regularSalarySacrifice',
      parameters: { baseSalary: facts.baseSalary },
    });
  }

  if (allocation.bonusSalarySacrifice > nextPeriodAdditionalGrossPay) {
    reasons.push({
      code: 'bonusSacrificeNotAssignableToNextPeriod',
      path: 'allocation.bonusSalarySacrifice',
      parameters: { nextPeriodAdditionalGrossPay },
    });
  }

  if (payroll.yearToDate !== undefined) {
    const { completedPeriods, taxablePay, incomeTaxPaid } = payroll.yearToDate;
    if (
      !Number.isInteger(completedPeriods) ||
      completedPeriods < 0 ||
      completedPeriods >= periodsPerYear ||
      !isNonNegativeInteger(taxablePay) ||
      !isNonNegativeInteger(incomeTaxPaid)
    ) {
      reasons.push({
        code: 'invalidPayrollYearToDate',
        path: 'facts.payroll.yearToDate',
        parameters: { completedPeriods, taxablePay, incomeTaxPaid },
      });
    }
  }

  return reasons;
};

const calculateIncomeTax = (
  taxablePay: MoneyPence,
  parsedCode: ParsedTaxCode,
  payroll: PayrollInputs,
  config: TaxYearConfig,
  periodsPerYear: number,
): MoneyPence => {
  if (parsedCode.kind === 'noTax') {
    return 0;
  }

  const completedPeriods =
    payroll.taxCodeBasis === 'cumulative'
      ? (payroll.yearToDate?.completedPeriods ?? 0)
      : 0;
  const period = completedPeriods + 1;
  const taxablePayToDate =
    payroll.taxCodeBasis === 'cumulative'
      ? taxablePay + (payroll.yearToDate?.taxablePay ?? 0)
      : taxablePay;

  if (parsedCode.kind === 'flatRate') {
    const taxDue = calculateAtRate(taxablePayToDate, parsedCode.flatRate ?? 0);
    return (
      taxDue -
      (payroll.taxCodeBasis === 'cumulative'
        ? (payroll.yearToDate?.incomeTaxPaid ?? 0)
        : 0)
    );
  }

  const allowance = roundDivide(
    parsedCode.annualAllowance * period,
    periodsPerYear,
  );
  const adjustment = roundDivide(
    parsedCode.annualAdjustment * period,
    periodsPerYear,
  );
  const taxableAfterCode = Math.max(
    0,
    taxablePayToDate + adjustment - allowance,
  );
  const taxDue = calculateBandedTax(
    taxableAfterCode,
    config.incomeTaxBands,
    period,
    periodsPerYear,
  );
  const incomeTaxPaid =
    payroll.taxCodeBasis === 'cumulative'
      ? (payroll.yearToDate?.incomeTaxPaid ?? 0)
      : 0;

  const taxForPeriod = taxDue - incomeTaxPaid;

  // HMRC limits PAYE Income Tax deductions under a K code to half of the
  // employee's pay for the current period. A cumulative calculation can still
  // produce a refund, which must remain uncapped.
  return parsedCode.kind === 'kCode'
    ? Math.min(taxForPeriod, Math.floor(taxablePay / 2))
    : taxForPeriod;
};

/**
 * Estimates the next PAYE period from annual plan values. It deliberately does
 * not participate in annual ANI optimisation or claim payslip reconciliation.
 */
export const projectPaye = (
  request: PayeProjectionRequest,
): PayeProjectionResult => {
  const { allocation, config, facts } = request;
  const payroll = facts.payroll;
  if (payroll === undefined) {
    return {
      kind: 'insufficientInputs',
      reasons: [{ code: 'missingPayrollInputs', parameters: EMPTY_PARAMETERS }],
    };
  }

  const periodsPerYear = periodsForFrequency[payroll.payFrequency];
  const inputReasons = [
    ...validateInputs(facts, allocation, payroll, periodsPerYear),
  ];
  if (!hasValidConfig(config)) {
    inputReasons.push({
      code: 'invalidTaxConfiguration',
      parameters: EMPTY_PARAMETERS,
    });
  }

  const parsed = parseTaxCode(payroll.taxCode, config);
  if (parsed.kind === 'failure') {
    inputReasons.push(parsed.reason);
  } else if (
    parsed.basisFromCode !== undefined &&
    parsed.basisFromCode !== payroll.taxCodeBasis
  ) {
    inputReasons.push({
      code: 'contradictoryTaxCodeBasis',
      path: 'facts.payroll.taxCodeBasis',
      parameters: EMPTY_PARAMETERS,
    });
  }

  if (inputReasons.length > 0) {
    return { kind: 'invalidOrUnsupported', reasons: inputReasons };
  }

  if (parsed.kind === 'failure') {
    throw new Error('Validated tax code parser unexpectedly failed.');
  }

  const regularSalarySacrifice = roundDivide(
    allocation.regularSalarySacrifice,
    periodsPerYear,
  );
  const grossPay =
    roundDivide(facts.baseSalary, periodsPerYear) +
    (payroll.nextPeriodAdditionalGrossPay ?? 0);
  const pensionSalarySacrifice =
    regularSalarySacrifice + allocation.bonusSalarySacrifice;
  const taxablePay = grossPay - pensionSalarySacrifice;
  const period =
    payroll.taxCodeBasis === 'cumulative'
      ? (payroll.yearToDate?.completedPeriods ?? 0) + 1
      : 1;
  const incomeTax = calculateIncomeTax(
    taxablePay,
    parsed.code,
    payroll,
    config,
    periodsPerYear,
  );
  const employeeNationalInsurance = calculateNationalInsurance(
    taxablePay,
    config.nationalInsurance.class1EmployeeBands,
    periodsPerYear,
  );
  const assumptions: PayrollAssumption[] = [
    {
      code: 'periodPayDerivedFromAnnualSalary',
      parameters: { periodsPerYear },
    },
    {
      code: 'regularSacrificeApportionedEvenly',
      parameters: { periodsPerYear },
    },
    {
      code: 'taxBandsAndCodeAllowancesApportionedByFrequency',
      parameters: { periodsPerYear },
    },
    {
      code: 'nationalInsuranceThresholdsAnnualised',
      parameters: { periodsPerYear },
    },
    { code: 'otherPayrollDeductionsNotModelled', parameters: EMPTY_PARAMETERS },
  ];
  if (allocation.bonusSalarySacrifice > 0) {
    assumptions.push({
      code: 'bonusSacrificeAppliedToNextPeriod',
      parameters: EMPTY_PARAMETERS,
    });
  }
  if (
    parsed.code.kind === 'kCode' &&
    incomeTax > 0 &&
    incomeTax === Math.floor(taxablePay / 2)
  ) {
    assumptions.push({
      code: 'kCodeDeductionCappedAtHalfPay',
      parameters: { maximumDeduction: incomeTax },
    });
  }
  if (payroll.yearToDate === undefined) {
    assumptions.push({
      code: 'yearToDateUnavailable',
      parameters: EMPTY_PARAMETERS,
    });
  } else if (payroll.taxCodeBasis === 'month1Week1') {
    assumptions.push({
      code: 'yearToDateIgnoredForNonCumulativeBasis',
      parameters: EMPTY_PARAMETERS,
    });
  }
  return {
    kind: 'supported',
    frequency: payroll.payFrequency,
    taxCode: parsed.code,
    nextPeriod: {
      period,
      grossPay,
      pensionSalarySacrifice,
      taxablePay,
      incomeTax,
      employeeNationalInsurance,
      netEmploymentPay: taxablePay - incomeTax - employeeNationalInsurance,
    },
    assumptions,
  };
};
