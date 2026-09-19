import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SummaryPanel, type SummaryOutcome } from './SummaryPanel';
import {
  formatAbsolutePounds,
  formatDeltaPounds,
  formatPounds,
} from './format';

const outcome: SummaryOutcome = {
  adjustedNetIncomePence: 10_050_00,
  annualDisposableCashPence: 7_400_00,
  annualNetEmploymentPayPence: 8_100_00,
  averagePeriodDisposableCashPence: 616_67,
  averagePeriodLabel: 'monthly',
  averagePeriodNetEmploymentPayPence: 675_00,
  incomeStatus: 'mixed',
  scenarioLabel: 'Optimal',
  targetHeadroomPence: -50_00,
};

describe('SummaryPanel', () => {
  it('labels annual, average-period, PAYE-aware, employment-pay, and cash amounts separately', () => {
    render(
      <SummaryPanel
        outcome={{
          ...outcome,
          payeAwareLabel: 'Projected next-month net employment pay',
          payeAwareNetEmploymentPayPence: 670_00,
        }}
      />,
    );

    expect(screen.getByText('Annual net employment pay')).toBeInTheDocument();
    expect(screen.getByText('Annual disposable cash')).toBeInTheDocument();
    expect(
      screen.getByText('Average monthly net employment pay'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Average monthly disposable cash'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Projected next-month net employment pay'),
    ).toBeInTheDocument();
    expect(screen.getByText(/mixed inputs/i)).toBeInTheDocument();
    expect(screen.getByText('Amount above target')).toBeInTheDocument();
    expect(screen.getByText('£50')).toBeInTheDocument();
  });

  it('keeps supplied issue order, severity words, and unknown-code fallback presentation', () => {
    render(
      <SummaryPanel
        outcome={{
          ...outcome,
          insights: [
            { code: 'notYetMapped', severity: 'information' },
            { code: 'aniBelowTarget', severity: 'positive' },
          ],
          issues: [
            { code: 'forecastIncomePresent', severity: 'warning' },
            { code: 'negativeAmount', severity: 'error' },
          ],
        }}
      />,
    );

    const issues = within(
      screen.getByRole('region', { name: /plan notices/i }),
    ).getAllByRole('listitem');
    expect(issues.map((issue) => issue.textContent)).toEqual([
      expect.stringContaining('Warning:'),
      expect.stringContaining('Error:'),
    ]);
    expect(
      screen.getByText('Calculation notice (notYetMapped)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Positive insight:')).toBeInTheDocument();
  });

  it('shows supplied scenario deltas without relabelling cash as employment pay', () => {
    render(
      <SummaryPanel
        outcome={{
          ...outcome,
          deltas: [
            {
              adjustedNetIncomePence: -100_00,
              annualDisposableCashPence: -25_00,
              annualNetEmploymentPayPence: -50_00,
              id: 'optimal',
              label: 'Optimal',
            },
          ],
        }}
      />,
    );

    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: 'ANI' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Net employment pay' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Disposable cash' }),
    ).toBeInTheDocument();
    expect(within(table).getByText('-£100')).toBeInTheDocument();
  });
});

describe('summary formatting', () => {
  it('formats integer-pence amounts and absolute headroom without changing their meaning', () => {
    expect(formatPounds(123_456)).toBe('£1,234.56');
    expect(formatPounds(-50_00)).toBe('-£50');
    expect(formatAbsolutePounds(-50_00)).toBe('£50');
    expect(formatDeltaPounds(50_00)).toBe('+£50');
  });
});
