import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import styles from './ReportPanel.module.css';
import { planningReportFixture, reportFixture } from './fixture';
import { ReportPanel } from './ReportPanel';

describe('ReportPanel', () => {
  it('renders the supplied report identity, inputs, comparison, notices, traces, and text chart alternative', () => {
    render(
      <ReportPanel
        generatedLabel="19 September 2026"
        report={planningReportFixture}
        sections={reportFixture}
      />,
    );

    expect(screen.getByText('uk-ruk-2026-27-v1')).toBeInTheDocument();
    expect(screen.getByText('Expected bonus')).toBeInTheDocument();
    expect(screen.getAllByText(/Forecast/)).not.toHaveLength(0);
    expect(
      screen.getByRole('heading', { name: 'Scenario comparison' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Warnings and checks' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Calculation traces' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Sacrifice trade-off table' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Disposable cash' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', {
        name: 'Additional regular sacrifice',
      }),
    ).toBeInTheDocument();
  });

  it('uses a print-only control and delegates printing to its host', async () => {
    const user = userEvent.setup();
    const onPrint = vi.fn();
    render(
      <ReportPanel
        generatedLabel="now"
        onPrint={onPrint}
        report={planningReportFixture}
        sections={reportFixture}
      />,
    );

    const button = screen.getByRole('button', { name: 'Print report' });
    expect(button).toHaveClass(styles.printControl!);
    await user.click(button);
    expect(onPrint).toHaveBeenCalledOnce();
  });
});
