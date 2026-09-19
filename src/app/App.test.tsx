import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { PlannerState } from '../domain';
import { DEFAULT_PLANNER_PLAN } from '../state';

import { App } from './App';

function plan(overrides: Partial<PlannerState> = {}): PlannerState {
  return {
    ...DEFAULT_PLANNER_PLAN,
    facts: {
      ...DEFAULT_PLANNER_PLAN.facts,
      baseSalary: 12_000_000,
      ...overrides.facts,
    },
    maxAdditionalRegularSalarySacrifice: 3_000_000,
    ...overrides,
  };
}

describe('App integration', () => {
  it('renders every live feature region without a fixture-only production path', () => {
    render(<App initialPlan={plan()} />);

    expect(
      screen.getByRole('heading', { name: /income and adjustments/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /salary sacrifice trade-off/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /compare scenarios/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { name: /calculation traces/i }),
    ).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: /scenario report/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('£120,000')).not.toHaveLength(0);
    expect(screen.getAllByText(/add optional paye details/i)).not.toHaveLength(
      0,
    );
  });

  it('keeps the last valid results visible and labels them stale for an invalid draft', async () => {
    const user = userEvent.setup();
    render(<App initialPlan={plan()} />);

    await user.clear(
      screen.getByRole('textbox', { name: 'Target adjusted net income' }),
    );

    expect(
      screen.getByText(/last valid calculation remains visible/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/results are stale while the draft is invalid/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/correct the plan inputs before a sacrifice curve/i),
    ).toBeInTheDocument();
  });

  it('shows a PAYE-aware label when sufficient optional payroll inputs are supplied', () => {
    render(
      <App
        initialPlan={plan({
          facts: {
            ...DEFAULT_PLANNER_PLAN.facts,
            baseSalary: 12_000_000,
            payroll: {
              taxCode: '1257L',
              taxCodeBasis: 'cumulative',
              payFrequency: 'monthly',
            },
          },
        })}
      />,
    );

    expect(
      screen.getAllByText(/paye-aware next monthly payslip/i),
    ).not.toHaveLength(0);
    expect(screen.getAllByText(/tax code 1257l/i)).not.toHaveLength(0);
  });

  it('persists theme selection and reports malformed imports without replacing the plan', async () => {
    const user = userEvent.setup();
    render(<App initialPlan={plan()} />);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    const file = new File(['{not json'], 'invalid-plan.json', {
      type: 'application/json',
    });
    Object.assign(file, { text: () => Promise.resolve('{not json') });
    await user.upload(screen.getByLabelText('Import plan'), file);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /this export cannot be imported/i,
      );
    });
    expect(screen.getAllByText('£120,000')).not.toHaveLength(0);
  });
});
