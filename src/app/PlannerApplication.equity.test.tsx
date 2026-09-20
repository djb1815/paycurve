import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { PlannerState } from '../domain';
import { PlannerProvider, DEFAULT_PLANNER_PLAN } from '../state';

import { PlannerApplication } from './PlannerApplication';

function plan(): PlannerState {
  return {
    ...DEFAULT_PLANNER_PLAN,
    facts: {
      ...DEFAULT_PLANNER_PLAN.facts,
      baseSalary: 12_000_000,
      equityIncome: [
        {
          id: 'imported-first',
          amount: 123_400,
          certainty: 'actual',
          label: 'First imported vest',
          vestDate: '2026-06-15',
        },
        {
          id: 'imported-second',
          amount: 567_800,
          certainty: 'forecast',
          label: 'Second imported vest',
        },
      ],
    },
  };
}

describe('PlannerApplication equity income inputs', () => {
  it('edits, adds, and removes vest events without collapsing imported events', async () => {
    const user = userEvent.setup();
    render(
      <PlannerProvider initialPlan={plan()}>
        <PlannerApplication />
      </PlannerProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Plan inputs' }));

    expect(
      screen.getByRole('textbox', { name: 'RSU and share income 1' }),
    ).toHaveValue('1234');
    expect(
      screen.getByRole('textbox', { name: 'RSU and share income 2' }),
    ).toHaveValue('5678');
    expect(
      screen.getByRole('textbox', { name: 'RSU / share event 1 label' }),
    ).toHaveValue('First imported vest');
    expect(
      screen.getByRole('textbox', { name: 'RSU / share event 1 vest date' }),
    ).toHaveValue('2026-06-15');

    const secondAmount = screen.getByRole('textbox', {
      name: 'RSU and share income 2',
    });
    await user.clear(secondAmount);
    await user.type(secondAmount, '7,000');
    expect(
      screen.getByRole('textbox', { name: 'RSU and share income 1' }),
    ).toHaveValue('1234');
    expect(secondAmount).toHaveValue('7,000');

    await user.click(
      screen.getByRole('checkbox', { name: 'Add an RSU / share vest event' }),
    );
    expect(
      screen.getByRole('textbox', { name: 'RSU and share income 3' }),
    ).toHaveValue('0');

    await user.click(
      screen.getByRole('checkbox', { name: 'Remove RSU / share event 1' }),
    );
    expect(
      screen.queryByDisplayValue('First imported vest'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'RSU and share income 1' }),
    ).toHaveValue('7,000');
  });
});
