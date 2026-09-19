/** Integer values in these units. Runtime validation is performed at boundaries. */
export type MoneyPence = number;

/** An integer rate where 10_000 is 100%. */
export type BasisPoints = number;

export type TaxYearId = '2026/27';

export type Certainty = 'forecast' | 'actual';

export interface EstimatedAmount {
  readonly amount: MoneyPence;
  readonly certainty: Certainty;
}
