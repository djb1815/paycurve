import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { chartFixture, chartMarkersFixture } from './fixture';
import { ProjectionChart } from './ProjectionChart';

describe('ProjectionChart', () => {
  it('lists all supplied marker types and keeps exact values in a collapsible table', async () => {
    render(
      <ProjectionChart
        markers={chartMarkersFixture}
        points={chartFixture}
        selectedIndex={1}
      />,
    );

    await userEvent.click(screen.getByText('Exact projection samples'));
    expect(
      screen.getByRole('complementary', { name: /curve markers/i }),
    ).toHaveTextContent(
      /ani target.*statutory threshold.*personal allowance breakpoint/i,
    );
    expect(
      screen.getByRole('columnheader', { name: /net employment pay/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ANI is shown as a line because it is a tax measure/i),
    ).toBeInTheDocument();
  });

  it('selects an Alternative using a native keyboard-accessible form control', () => {
    const onSelectedIndexChange = vi.fn();
    render(
      <ProjectionChart
        onSelectedIndexChange={onSelectedIndexChange}
        points={chartFixture}
        selectedIndex={0}
      />,
    );

    const slider = screen.getByRole('slider', {
      name: /alternative regular sacrifice/i,
    });
    fireEvent.change(slider, { target: { value: '2' } });

    expect(onSelectedIndexChange).toHaveBeenCalledWith(2);
    expect(screen.getByText(/alternative: £0/i)).toBeInTheDocument();
  });

  it('provides useful invalid, unreachable, and empty states', () => {
    const { rerender } = render(
      <ProjectionChart points={[]} selectedIndex={0} status="invalid" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /correct the plan inputs/i,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      /add valid plan inputs/i,
    );

    rerender(
      <ProjectionChart
        points={chartFixture}
        selectedIndex={1}
        status="unreachable"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      /target cannot be reached/i,
    );
  });
});
