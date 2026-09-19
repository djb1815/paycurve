import type { MoneyPence } from '../domain/money';
import type { TaxYearConfig } from './config/types';
import { roundHalfUp } from './math';

const BASIS_POINT_DENOMINATOR = 10_000;

export interface PersonalAllowanceCalculation {
  readonly adjustedNetIncome: MoneyPence;
  readonly reduction: MoneyPence;
  readonly allowance: MoneyPence;
}

export function calculatePersonalAllowance(
  adjustedNetIncome: MoneyPence,
  config: TaxYearConfig,
): PersonalAllowanceCalculation {
  const excess = Math.max(
    0,
    adjustedNetIncome - config.personalAllowanceTaperThreshold,
  );
  const allowance = Math.max(
    0,
    roundHalfUp(
      config.personalAllowance * BASIS_POINT_DENOMINATOR -
        excess * config.personalAllowanceTaperRate,
      BASIS_POINT_DENOMINATOR,
    ),
  );

  return {
    adjustedNetIncome,
    reduction: config.personalAllowance - allowance,
    allowance,
  };
}
