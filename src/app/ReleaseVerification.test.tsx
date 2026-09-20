import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { PlannerState } from '../domain';
import { encodeExport } from '../persistence';
import type { LocalPlanStorage } from '../persistence';
import { DEFAULT_PLANNER_PLAN } from '../state';
import { resolveTaxYear } from '../tax/config';

import { App } from './App';

function releasePlan(overrides: Partial<PlannerState> = {}): PlannerState {
  return {
    ...DEFAULT_PLANNER_PLAN,
    facts: {
      ...DEFAULT_PLANNER_PLAN.facts,
      baseSalary: 12_000_000,
      bonus: {
        guidePercentage: 0,
        amountOverride: { amount: 1_000_000, certainty: 'forecast' },
      },
      equityIncome: [
        { id: 'rsu-autumn', amount: 250_000, certainty: 'forecast' },
      ],
      ...overrides.facts,
    },
    current: {
      ...DEFAULT_PLANNER_PLAN.current,
      sippNetContribution: 40_000,
      giftAidCashDonation: 30_000,
      ...overrides.current,
    },
    alternative: {
      ...DEFAULT_PLANNER_PLAN.alternative,
      ...overrides.alternative,
    },
    maxAdditionalRegularSalarySacrifice: 4_000_000,
    ...overrides,
  };
}

function fileWithText(name: string, text: string): File {
  const file = new File([text], name, { type: 'application/json' });
  Object.assign(file, { text: () => Promise.resolve(text) });
  return file;
}

describe('release verification', () => {
  it('presents a live baseline with forecast headroom, cash adjustments, and an accessible chart alternative', async () => {
    const user = userEvent.setup();
    render(<App initialPlan={releasePlan()} />);

    expect(
      screen.getByText(/minimum regular sacrifice needed to reach the target/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/forecast amounts affect headroom/i),
    ).not.toHaveLength(0);
    expect(screen.getAllByText(/annual disposable cash/i)).not.toHaveLength(0);

    fireEvent.change(
      screen.getByRole('slider', { name: /alternative regular sacrifice/i }),
      { target: { value: '1' } },
    );

    expect(screen.getByRole('radio', { name: /alternative/i })).toBeChecked();
    expect(
      screen.getByRole('table', {
        name: /exact projection samples across additional regular salary sacrifice/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/alternative:/i),
    ).toBeInTheDocument();
  });

  it('states reached, already-below, and unreachable target outcomes in text', () => {
    const reached = render(<App initialPlan={releasePlan()} />);
    expect(
      screen.getByText(/minimum regular sacrifice needed to reach the target/i),
    ).toBeInTheDocument();
    reached.unmount();

    const alreadyBelow = render(
      <App
        initialPlan={releasePlan({
          facts: { ...DEFAULT_PLANNER_PLAN.facts, baseSalary: 9_900_000 },
          maxAdditionalRegularSalarySacrifice: 0,
        })}
      />,
    );
    expect(
      screen.getByText(/current allocation already meets the target/i),
    ).toBeInTheDocument();
    alreadyBelow.unmount();

    render(
      <App
        initialPlan={releasePlan({
          maxAdditionalRegularSalarySacrifice: 50_000,
        })}
      />,
    );
    expect(
      screen.getAllByText(
        /target cannot be reached within the selected sacrifice limit/i,
      ),
    ).not.toHaveLength(0);
    expect(screen.getAllByText('Optimal limit')).not.toHaveLength(0);
  });

  it('distinguishes insufficient, supported, and invalid PAYE states without changing annual planning', () => {
    const withoutPayroll = render(<App initialPlan={releasePlan()} />);
    expect(
      screen.getAllByText(
        /add optional paye details to see a next-payslip estimate/i,
      ),
    ).not.toHaveLength(0);
    withoutPayroll.unmount();

    const supported = render(
      <App
        initialPlan={releasePlan({
          facts: {
            ...releasePlan().facts,
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
      screen.getByRole('heading', {
        name: /paye-aware next monthly payslip breakdown/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/not payslip reconciliation/i)).not.toHaveLength(
      0,
    );
    supported.unmount();

    render(
      <App
        initialPlan={releasePlan({
          facts: {
            ...releasePlan().facts,
            payroll: {
              taxCode: 'S1257L',
              taxCodeBasis: 'cumulative',
              payFrequency: 'monthly',
            },
          },
        })}
      />,
    );
    expect(
      screen.getAllByText(/paye-aware estimate is unavailable/i),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText(
        /supported england, wales, or northern ireland tax code/i,
      ),
    ).not.toHaveLength(0);
  });

  it('supports keyboard-only core controls, themes, print content, and non-colour status labels', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<App initialPlan={releasePlan()} />);

    screen.getByRole('radio', { name: /current/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /optimal/i })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Plan inputs' }));
    const payrollDisclosure = screen.getByRole('checkbox', {
      name: 'Add PAYE details',
    });
    payrollDisclosure.focus();
    await user.keyboard(' ');
    expect(screen.getByLabelText('PAYE tax code')).toBeInTheDocument();

    await user.click(screen.getAllByRole('radio', { name: 'dark' })[0]!);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getAllByRole('radio', { name: 'light' })[0]!);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await user.click(screen.getAllByRole('radio', { name: 'system' })[0]!);
    expect(document.documentElement).not.toHaveAttribute('data-theme');

    await user.click(screen.getByRole('button', { name: 'Summary' }));
    expect(screen.getAllByText(/^Information:/)).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Print report' }));
    expect(screen.getByRole('heading', { name: /sacrifice trade-off table/i })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Print report' })[1]!);
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it('keeps a plan open through storage failure and rejects then accepts imports', async () => {
    const user = userEvent.setup();
    const storage: LocalPlanStorage = {
      load: () => ({ kind: 'missing' }),
      remove: () => ({ kind: 'removed' }),
      save: () => ({
        kind: 'storageFailure',
        operation: 'write',
        error: new Error('quota exceeded'),
      }),
    };
    const original = releasePlan();
    const imported = releasePlan({
      facts: { ...releasePlan().facts, baseSalary: 11_000_000 },
    });
    const exportJson = encodeExport(
      imported,
      resolveTaxYear(imported.taxYear).version,
      new Date('2026-09-20T12:00:00.000Z'),
    );
    render(<App initialPlan={original} storage={storage} />);
    await user.click(screen.getByRole('button', { name: 'Plan inputs' }));

    await user.clear(screen.getByRole('textbox', { name: 'Base salary' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Base salary' }),
      '120000',
    );
    await waitFor(() => {
      expect(
        screen.getByText(/local storage could not save this change/i),
      ).toBeInTheDocument();
    });

    await user.upload(
      screen.getByLabelText('Import plan'),
      fileWithText('malformed.json', '{bad json'),
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /this export cannot be imported/i,
      );
    });
    expect(screen.getByDisplayValue('120000')).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText('Import plan'),
      fileWithText('valid-paycurve-plan.json', exportJson),
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('110000')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
