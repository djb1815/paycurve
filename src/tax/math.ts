import type { BasisPoints, MoneyPence } from '../domain/money';

const BASIS_POINT_DENOMINATOR = 10_000;

/** Rounds a non-negative fractional penny to the nearest penny, with .5 upward. */
export function roundHalfUp(
  numerator: number,
  denominator: number,
): MoneyPence {
  return Math.floor((numerator + denominator / 2) / denominator);
}

export function amountAtRate(
  amount: MoneyPence,
  rate: BasisPoints,
): MoneyPence {
  return roundHalfUp(amount * rate, BASIS_POINT_DENOMINATOR);
}

export function amountBeforeBasicRateRelief(
  netAmount: MoneyPence,
  basicRate: BasisPoints,
): MoneyPence {
  return roundHalfUp(
    netAmount * BASIS_POINT_DENOMINATOR,
    BASIS_POINT_DENOMINATOR - basicRate,
  );
}

export function percentageOf(
  amount: MoneyPence,
  rate: BasisPoints,
): MoneyPence {
  return amountAtRate(amount, rate);
}
