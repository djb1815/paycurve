import type { TaxYearId } from '../../domain/money';

import { TAX_YEAR_2026_27 } from './2026-27';
import type { TaxYearConfig } from './types';

export type {
  NationalInsuranceBand,
  NationalInsuranceConfig,
  PensionConfig,
  SavingsIncomeConfig,
  TaxBand,
  TaxYearConfig,
} from './types';
export { TAX_YEAR_2026_27 } from './2026-27';

const CONFIGURATIONS: Readonly<Record<TaxYearId, TaxYearConfig>> = {
  '2026/27': TAX_YEAR_2026_27,
};

/** Returns the policy configuration for an explicitly selected tax year. */
export function resolveTaxYear(id: TaxYearId): TaxYearConfig {
  return CONFIGURATIONS[id];
}
