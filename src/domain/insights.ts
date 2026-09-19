import type { MoneyPence } from './money';
import type { ScenarioComparison } from './optimisation';

export type InsightSeverity = 'information' | 'positive' | 'warning';

export type InsightCode =
  | 'aniAboveTarget'
  | 'aniBelowTarget'
  | 'additionalSacrificeRequired'
  | 'fullBonusSacrificeSufficient'
  | 'fullBonusSacrificeInsufficient'
  | 'forecastHeadroom'
  | 'personalAllowanceRestored'
  | 'effectiveContributionCost'
  | 'nearStatutoryThreshold'
  | 'pensionAllowanceHeadroom'
  | 'averagePeriodCashChange'
  | 'payeAwareCash';

export interface Insight {
  readonly code: InsightCode;
  readonly severity: InsightSeverity;
  readonly parameters: Readonly<Record<string, number>>;
}

export interface InsightRequest {
  readonly comparison: ScenarioComparison;
  readonly nearThresholdMargin: MoneyPence;
}
