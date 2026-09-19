import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App shell', () => {
  it('renders every fixture-backed feature region', () => {
    render(<App />);

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
      screen.getByRole('heading', { name: /calculation traces/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /scenario report/i }),
    ).toBeInTheDocument();
  });

  it('exposes a working non-pointer theme control', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
