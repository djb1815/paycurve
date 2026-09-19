import { PlannerProvider } from '../state';
import type { PlannerProviderProps } from '../state';

import { PlannerApplication } from './PlannerApplication';

export type AppProps = Pick<
  PlannerProviderProps,
  'dependencies' | 'initialPlan' | 'initialTheme' | 'storage' | 'themeStorage'
>;

/** The single state boundary around the browser-only planner page. */
export function App(props: AppProps = {}) {
  return (
    <PlannerProvider {...props}>
      <PlannerApplication />
    </PlannerProvider>
  );
}
