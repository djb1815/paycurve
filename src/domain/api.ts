import type { CalculationIssue } from './calculation';
import type { Insight, InsightRequest } from './insights';
import type {
  ComparisonRequest,
  CurvePoint,
  CurveRequest,
  OptimisationRequest,
  OptimisationResult,
  ScenarioComparison,
} from './optimisation';
import type { PlannerState } from './plan';
import type { Projection, ProjectionRequest } from './projection';
import type { TaxYearConfig } from '../tax/config/types';

export type ResolveTaxYear = (id: PlannerState['taxYear']) => TaxYearConfig;

export type ValidatePlan = (
  plan: PlannerState,
  config: TaxYearConfig,
) => readonly CalculationIssue[];

export type Project = (request: ProjectionRequest) => Projection;

export type OptimiseToTarget = (
  request: OptimisationRequest,
) => OptimisationResult;

export type SampleSacrificeCurve = (
  request: CurveRequest,
) => readonly CurvePoint[];

export type CompareScenarios = (
  request: ComparisonRequest,
) => ScenarioComparison;

export type DeriveInsights = (request: InsightRequest) => readonly Insight[];
