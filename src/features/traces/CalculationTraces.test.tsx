import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CalculationTraces, type CalculationTrace } from './CalculationTraces';

const trace: CalculationTrace = {
  id: 'income-tax',
  lines: [
    {
      code: 'taxableIncome',
      formattedAmount: '£80,000',
      id: 'taxable-income',
      operation: 'input',
    },
    {
      code: 'incomeTaxBand',
      formattedAmount: '−£7,486',
      id: 'basic-rate',
      operation: 'subtract',
    },
    {
      code: 'incomeTax',
      formattedAmount: '£17,432',
      id: 'income-tax-total',
      operation: 'result',
    },
  ],
  summary: 'How the supplied annual Income Tax total was derived',
  title: 'Income Tax',
  total: {
    formattedAmount: '£17,432',
    label: 'Supplied Income Tax total',
  },
};

describe('CalculationTraces', () => {
  it('expands and collapses a trace with the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(<CalculationTraces traces={[trace]} />);
    const details = container.querySelector('details');
    const summary = container.querySelector('summary');

    expect(details).not.toHaveAttribute('open');
    summary?.focus();
    await user.keyboard('{Enter}');
    expect(details).toHaveAttribute('open');
    await user.keyboard('{Enter}');
    expect(details).not.toHaveAttribute('open');
  });

  it('shows supplied rows in order and visibly reconciles to the supplied total', () => {
    render(<CalculationTraces traces={[trace]} />);

    const details = screen
      .getByText('Income Tax', { selector: 'summary span' })
      .closest('details');
    expect(details).not.toBeNull();
    expect(
      within(details as HTMLElement).getByText('Taxable income'),
    ).toBeInTheDocument();
    expect(
      within(details as HTMLElement).getByText('Income Tax band'),
    ).toBeInTheDocument();
    expect(
      within(details as HTMLElement).getByText('Supplied Income Tax total:'),
    ).toBeInTheDocument();

    const labels = within(details as HTMLElement)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(labels).toEqual(['Taxable income', 'Income Tax band', 'Income Tax']);
  });

  it('uses a safe label for an unknown trace code', () => {
    render(
      <CalculationTraces
        traces={[
          {
            ...trace,
            id: 'unknown',
            lines: [
              {
                code: 'futureTaxStep',
                formattedAmount: '£1',
                id: 'future-step',
              },
            ],
          },
        ]}
      />,
    );

    expect(
      screen.getByText('Calculation item (futureTaxStep)'),
    ).toBeInTheDocument();
  });
});
