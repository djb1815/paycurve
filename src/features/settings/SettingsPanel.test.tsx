import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SettingsPanel, type ThemePreference } from './SettingsPanel';

function ThemeFixture({
  onThemeChange,
}: {
  readonly onThemeChange: (theme: ThemePreference) => void;
}) {
  const [theme, setTheme] = useState<ThemePreference>('system');
  return (
    <SettingsPanel
      onThemeChange={(nextTheme) => {
        setTheme(nextTheme);
        onThemeChange(nextTheme);
      }}
      storageStatus="Saved locally"
      taxYearLabel="2026/27"
      theme={theme}
    />
  );
}

describe('SettingsPanel', () => {
  it('changes the System, Light, and Dark native radio controls by keyboard', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<ThemeFixture onThemeChange={onThemeChange} />);

    screen.getByRole('radio', { name: 'System' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onThemeChange).toHaveBeenLastCalledWith('light');
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();

    await user.keyboard('{ArrowRight}');
    expect(onThemeChange).toHaveBeenLastCalledWith('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('passes a selected JSON file to the host and exposes an actionable import failure', async () => {
    const user = userEvent.setup();
    const onImportFile = vi.fn();
    const onDismissImportError = vi.fn();
    render(
      <SettingsPanel
        importError={{
          title: 'This export cannot be imported',
          detail: 'Choose an export for tax year 2026/27 or start a new plan.',
        }}
        onDismissImportError={onDismissImportError}
        onImportFile={onImportFile}
        storageStatus="Saved locally"
        taxYearLabel="2026/27"
        theme="system"
      />,
    );

    const file = new File(['{}'], 'plan.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Import plan'), file);
    expect(onImportFile).toHaveBeenCalledWith(file);
    expect(screen.getByRole('alert')).toHaveTextContent(
      /choose an export for tax year 2026\/27/i,
    );
    await user.click(
      screen.getByRole('button', { name: 'Dismiss import error' }),
    );
    expect(onDismissImportError).toHaveBeenCalledOnce();
  });

  it('warns before export and offers static official help links without plan values', () => {
    render(
      <SettingsPanel
        storageStatus="Saved locally"
        taxYearLabel="2026/27"
        theme="system"
      />,
    );

    expect(screen.getByText(/data is sensitive/i)).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: /hmrc: adjusted net income/i,
    });
    expect(link).toHaveAttribute(
      'href',
      'https://www.gov.uk/guidance/adjusted-net-income',
    );
    expect(link.getAttribute('href')).not.toContain('?');
  });
});
