import type { CalculationTrace, TraceStep } from '../domain/calculation';
import type { BasisPoints, MoneyPence } from '../domain/money';
import type { TaxBand, TaxYearConfig } from './config/types';
import { amountAtRate } from './math';

export interface IncomeTaxInput {
  /** Taxable non-savings income after Personal Allowance. */
  readonly nonSavingsIncome: MoneyPence;
  /** Taxable savings income after Personal Allowance. */
  readonly savingsIncome: MoneyPence;
  /** Gross Gift Aid and relief-at-source pension payments extending the basic band. */
  readonly basicRateBandExtension?: MoneyPence;
}

export interface IncomeTaxBandCalculation {
  readonly bandId: string;
  readonly taxableAmount: MoneyPence;
  readonly tax: MoneyPence;
  readonly rate: BasisPoints;
}

export interface IncomeTaxCalculation {
  readonly startingRateSavings: MoneyPence;
  readonly personalSavingsAllowance: MoneyPence;
  readonly bands: readonly IncomeTaxBandCalculation[];
  readonly tax: MoneyPence;
  readonly trace: CalculationTrace;
}

function remainingCapacity(
  band: TaxBand,
  alreadyAllocated: MoneyPence,
): MoneyPence {
  return band.width === null
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, band.width - alreadyAllocated);
}

function taxpayerPersonalSavingsAllowance(
  taxableIncome: MoneyPence,
  basicRateBandExtension: MoneyPence,
  config: TaxYearConfig,
): MoneyPence {
  const basicBand = config.incomeTaxBands[0];
  const higherBand = config.incomeTaxBands[1];
  if (
    basicBand === undefined ||
    higherBand === undefined ||
    basicBand.width === null ||
    higherBand.width === null
  ) {
    throw new Error(
      'Tax configuration requires finite basic and higher-rate bands.',
    );
  }
  if (taxableIncome <= basicBand.width + basicRateBandExtension) {
    return config.savingsIncome.personalSavingsAllowance.basicRateTaxpayer;
  }
  if (
    taxableIncome <=
    basicBand.width + higherBand.width + basicRateBandExtension
  ) {
    return config.savingsIncome.personalSavingsAllowance.higherRateTaxpayer;
  }
  return config.savingsIncome.personalSavingsAllowance.additionalRateTaxpayer;
}

/**
 * Taxes non-savings income before savings income, then applies the configured
 * starting-rate and Personal Savings Allowance zero-rate bands to savings.
 */
export function calculateIncomeTax(
  input: IncomeTaxInput,
  config: TaxYearConfig,
): IncomeTaxCalculation {
  const nonSavingsIncome = Math.max(0, input.nonSavingsIncome);
  const savingsIncome = Math.max(0, input.savingsIncome);
  const basicRateBandExtension = Math.max(0, input.basicRateBandExtension ?? 0);
  const startingRateSavings = Math.min(
    savingsIncome,
    Math.max(0, config.savingsIncome.startingRateLimit - nonSavingsIncome),
  );
  const incomeAfterStartingRate =
    nonSavingsIncome + savingsIncome - startingRateSavings;
  const personalSavingsAllowance = Math.min(
    savingsIncome - startingRateSavings,
    taxpayerPersonalSavingsAllowance(
      incomeAfterStartingRate,
      basicRateBandExtension,
      config,
    ),
  );
  let nonSavingsRemaining = nonSavingsIncome;
  let savingsRemaining =
    savingsIncome - startingRateSavings - personalSavingsAllowance;
  const bands: IncomeTaxBandCalculation[] = [];
  const steps: TraceStep[] = [];
  let tax = 0;

  for (const [index, band] of config.incomeTaxBands.entries()) {
    const bandExtension = index === 0 ? basicRateBandExtension : 0;
    const effectiveBand: TaxBand = {
      ...band,
      width: band.width === null ? null : band.width + bandExtension,
    };
    const nonSavingsTaxable = Math.min(
      nonSavingsRemaining,
      remainingCapacity(effectiveBand, 0),
    );
    nonSavingsRemaining -= nonSavingsTaxable;
    const capacityAfterNonSavings = remainingCapacity(
      effectiveBand,
      nonSavingsTaxable,
    );
    const savingsTaxable = Math.min(savingsRemaining, capacityAfterNonSavings);
    savingsRemaining -= savingsTaxable;
    const taxableAmount = nonSavingsTaxable + savingsTaxable;
    const bandTax = amountAtRate(taxableAmount, band.rate);
    tax += bandTax;
    const calculation = {
      bandId: band.id,
      taxableAmount,
      tax: bandTax,
      rate: band.rate,
    };
    bands.push(calculation);
    steps.push({
      code: 'incomeTaxBand',
      operation: 'add',
      amount: bandTax,
      rate: band.rate,
      parameters: {
        taxableAmount,
        nonSavingsTaxable,
        savingsTaxable,
        basicRateBandExtension: bandExtension,
      },
    });
  }

  if (startingRateSavings > 0) {
    steps.unshift({
      code: 'incomeTaxBand',
      operation: 'input',
      amount: 0,
      rate: config.savingsIncome.startingRate,
      parameters: { taxableAmount: startingRateSavings, zeroRateSavings: 1 },
    });
  }
  if (personalSavingsAllowance > 0) {
    steps.unshift({
      code: 'incomeTaxBand',
      operation: 'input',
      amount: 0,
      rate: 0,
      parameters: {
        taxableAmount: personalSavingsAllowance,
        personalSavingsAllowance: 1,
      },
    });
  }
  steps.push({
    code: 'incomeTax',
    operation: 'result',
    amount: tax,
    runningTotal: tax,
  });

  return {
    startingRateSavings,
    personalSavingsAllowance,
    bands,
    tax,
    trace: { steps, total: tax },
  };
}
