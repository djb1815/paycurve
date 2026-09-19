import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { scenariosFixture } from './fixture';
import { ScenarioComparison } from './ScenarioComparison';

describe('ScenarioComparison', () => {
  it('selects a scenario with keyboard-operable radios and resets Alternative', async () => {
    const user = userEvent.setup();
    const onSelectScenario = vi.fn();
    const onResetAlternative = vi.fn();
    render(
      <ScenarioComparison
        onResetAlternative={onResetAlternative}
        onSelectScenario={onSelectScenario}
        scenarios={scenariosFixture}
        selectedScenarioId="optimal"
      />,
    );

    await user.click(screen.getByRole('radio', { name: /current/i }));
    await user.keyboard('{Tab}{Enter}');

    expect(onSelectScenario).toHaveBeenCalledWith('current');
    expect(onResetAlternative).toHaveBeenCalledWith('current');
  });

  it('shows separate cash and employment-pay values in its text comparison', () => {
    render(
      <ScenarioComparison
        scenarios={scenariosFixture}
        selectedScenarioId="optimal"
      />,
    );

    expect(screen.getByRole('cell', { name: '£71,700' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '£67,600' })).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /exact scenario comparison/i }),
    ).toBeInTheDocument();
  });

  it('explains invalid, unreachable, and empty comparison states', () => {
    const { rerender } = render(
      <ScenarioComparison
        scenarios={[]}
        selectedScenarioId="current"
        status="invalid"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /correct the plan inputs/i,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/will appear/i);

    rerender(
      <ScenarioComparison
        scenarios={scenariosFixture}
        selectedScenarioId="alternative"
        status="unreachable"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      /target is unreachable/i,
    );
  });
});
