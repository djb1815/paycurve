import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
  it('renders the live features in their focused views', async () => {
    const user = userEvent.setup();
    render(<App initialPlan={plan()} />);

    expect(
      screen.getByRole('heading', { name: /where employment pay goes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /compare scenarios/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Plan inputs' }));
    expect(
      screen.getByRole('heading', { name: /income and adjustments/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Print report' }));
    expect(
      screen.getByRole('heading', { name: /scenario report/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Summary' }));
    expect(screen.getAllByText('£120,000')).not.toHaveLength(0);
    expect(screen.getAllByText(/add optional paye details/i)).not.toHaveLength(
      0,
    );
  });

  it('keeps the last valid results visible and labels them stale for an invalid draft', async () => {
    const user = userEvent.setup();
    render(<App initialPlan={plan()} />);

    await user.click(screen.getByRole('button', { name: 'Plan inputs' }));

    await user.clear(
      screen.getByRole('textbox', { name: 'Target adjusted net income' }),
    );

    await user.click(screen.getByRole('button', { name: 'Summary' }));

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

    await user.click(screen.getByRole('radio', { name: 'dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(screen.getByRole('button', { name: 'Plan inputs' }));
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
    await user.click(screen.getByRole('button', { name: 'Summary' }));
    expect(screen.getAllByText('£120,000')).not.toHaveLength(0);
  });

  it('communicates reached, already-below, and unreachable targets without relying on colour', () => {
    const { rerender } = render(<App initialPlan={plan()} />);
    expect(
      screen.getByText(/minimum regular sacrifice needed to reach the target/i),
    ).toBeInTheDocument();

    rerender(
      <App
        key="already-below"
        initialPlan={plan({
          facts: { ...DEFAULT_PLANNER_PLAN.facts, baseSalary: 9_900_000 },
          maxAdditionalRegularSalarySacrifice: 0,
        })}
      />,
    );
    expect(
      screen.getByText(/current allocation already meets the target/i),
    ).toBeInTheDocument();

    rerender(
      <App
        key="unreachable"
        initialPlan={plan({ maxAdditionalRegularSalarySacrifice: 500_000 })}
      />,
    );
    expect(
      screen.getByText(
        /target cannot be reached within the selected sacrifice limit/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Optimal limit')).not.toHaveLength(0);
  });

  it('includes all supplied financial and payroll inputs in the printable report', async () => {
    const user = userEvent.setup();
    render(
      <App
        initialPlan={plan({
          current: {
            regularSalarySacrifice: 120_000,
            bonusSalarySacrifice: 80_000,
            sippNetContribution: 40_000,
            giftAidCashDonation: 30_000,
          },
          facts: {
            ...DEFAULT_PLANNER_PLAN.facts,
            baseSalary: 12_000_000,
            bonus: {
              guidePercentage: 0,
              amountOverride: { amount: 500_000, certainty: 'actual' },
            },
            equityIncome: [
              { id: 'rsu-one', amount: 300_000, certainty: 'forecast' },
            ],
            taxableBenefits: { amount: 20_000, certainty: 'actual' },
            savingsInterest: { amount: 10_000, certainty: 'forecast' },
            otherTaxableIncome: 5_000,
            employerPensionContribution: 70_000,
            payroll: {
              taxCode: '1257L',
              taxCodeBasis: 'cumulative',
              payFrequency: 'monthly',
              nextPeriodAdditionalGrossPay: 50_000,
              yearToDate: {
                completedPeriods: 3,
                taxablePay: 3_000_000,
                incomeTaxPaid: 600_000,
              },
            },
          },
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Print report' }));
    const report = screen
      .getByRole('heading', { name: 'Scenario report' })
      .closest('section');
    expect(report).not.toBeNull();
    const reportScope = within(report!);
    for (const label of [
      'Expected bonus',
      'RSU and share income',
      'Taxable benefits',
      'Savings interest',
      'Other taxable income',
      'Employer pension contribution',
      'Current total regular salary sacrifice',
      'Current bonus salary sacrifice',
      'Current SIPP contribution paid',
      'Current Gift Aid donation',
      'Maximum additional regular salary sacrifice',
      'PAYE tax code',
      'Year-to-date taxable pay',
    ]) {
      expect(reportScope.getByText(label)).toBeInTheDocument();
    }
  });

  it('supports keyboard scenario selection, all themes, and printing', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<App initialPlan={plan()} />);

    screen.getByRole('radio', { name: /Current/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /Optimal/i })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await user.click(screen.getByRole('radio', { name: 'system' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');

    await user.click(screen.getByRole('button', { name: 'Print report' }));
    await user.click(
      screen.getAllByRole('button', { name: 'Print report' })[1]!,
    );
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
