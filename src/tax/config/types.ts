import type { BasisPoints, MoneyPence, TaxYearId } from '../../domain/money';

export interface TaxBand {
  readonly id: string;
  /** Taxable width of this band. Null denotes an unbounded final band. */
  readonly width: MoneyPence | null;
  readonly rate: BasisPoints;
}

export interface NationalInsuranceBand {
  readonly id: string;
  /** Annual earnings threshold at which this band starts, inclusive. */
  readonly lowerBound: MoneyPence;
  /** Null denotes no upper earnings bound. */
  readonly upperBound: MoneyPence | null;
  readonly rate: BasisPoints;
}

export interface NationalInsuranceConfig {
  readonly class1EmployeeBands: readonly NationalInsuranceBand[];
  /** Documents that the annual engine approximates per-period payroll NI. */
  readonly annualised: true;
}

export interface SavingsIncomeConfig {
  /** Maximum zero-rate savings band before reduction by non-savings income. */
  readonly startingRateLimit: MoneyPence;
  readonly startingRate: BasisPoints;
  readonly personalSavingsAllowance: {
    readonly basicRateTaxpayer: MoneyPence;
    readonly higherRateTaxpayer: MoneyPence;
    readonly additionalRateTaxpayer: MoneyPence;
  };
}

export interface PensionConfig {
  readonly annualAllowance: MoneyPence;
  readonly allowanceWarningMargin: MoneyPence;
  readonly reliefAtSourceBasicRate: BasisPoints;
}

export interface TaxYearConfig {
  readonly id: TaxYearId;
  /** Changes when policy data or calculation interpretation is revised. */
  readonly version: string;
  readonly personalAllowance: MoneyPence;
  readonly personalAllowanceTaperThreshold: MoneyPence;
  /** ANI above this point has no Personal Allowance. */
  readonly personalAllowanceExhaustionThreshold: MoneyPence;
  readonly personalAllowanceTaperRate: BasisPoints;
  readonly incomeTaxBands: readonly TaxBand[];
  readonly savingsIncome: SavingsIncomeConfig;
  readonly nationalInsurance: NationalInsuranceConfig;
  readonly childcareAniThreshold: MoneyPence;
  readonly pension: PensionConfig;
}
