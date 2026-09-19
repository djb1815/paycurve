import type { PlannerState } from '../domain';
import {
  compareScenarios,
  optimiseToTarget,
  sampleSacrificeCurve,
} from '../optimisation';
import { projectPaye } from '../payroll';
import { project } from '../projection';
import { deriveInsights } from '../insights';

import type { PlannerDerivedState, PlannerStateDependencies } from './types';

export const DEFAULT_CURVE_POINT_COUNT = 25;
export const DEFAULT_NEAR_THRESHOLD_MARGIN_PENCE = 100_000;

/** Derive all calculation-facing data from a validated plan without mutating it. */
export function derivePlannerState(
  plan: PlannerState,
  dependencies: PlannerStateDependencies,
): PlannerDerivedState {
  const config = dependencies.resolveTaxYear(plan.taxYear);
  const currentProjection = project({
    config,
    facts: plan.facts,
    allocation: plan.current,
    targetAni: plan.targetAni,
  });
  const alternativeProjection = project({
    config,
    facts: plan.facts,
    allocation: plan.alternative,
    targetAni: plan.targetAni,
  });
  const optimisationRequest = {
    config,
    facts: plan.facts,
    current: plan.current,
    targetAni: plan.targetAni,
    maxAdditionalRegularSalarySacrifice:
      plan.maxAdditionalRegularSalarySacrifice,
  };
  const optimal = optimiseToTarget(optimisationRequest);
  const comparison = compareScenarios({
    current: {
      id: 'current',
      allocation: plan.current,
      projection: currentProjection,
    },
    optimal,
    alternative: {
      id: 'alternative',
      allocation: plan.alternative,
      projection: alternativeProjection,
    },
  });

  return {
    plan,
    config,
    current: { allocation: plan.current, projection: currentProjection },
    alternative: {
      allocation: plan.alternative,
      projection: alternativeProjection,
    },
    optimal,
    comparison,
    curve: sampleSacrificeCurve({
      ...optimisationRequest,
      alternative: plan.alternative,
      maxPoints: dependencies.curvePointCount ?? DEFAULT_CURVE_POINT_COUNT,
    }),
    insights: deriveInsights({
      comparison,
      nearThresholdMargin:
        dependencies.nearThresholdMarginPence ??
        DEFAULT_NEAR_THRESHOLD_MARGIN_PENCE,
    }),
    paye: projectPaye({
      config,
      facts: plan.facts,
      allocation: plan.current,
    }),
  };
}
