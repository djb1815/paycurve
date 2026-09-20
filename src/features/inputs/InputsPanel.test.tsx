import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { plannerInputsFixture } from './fixture';
import { InputsPanel, type PlannerInputsForm } from './InputsPanel';

function renderFixture(form: PlannerInputsForm = plannerInputsFixture) {
  const onValueChange = vi.fn();
  const onPenceValueChange = vi.fn();
  const onStatusChange = vi.fn();
  const onPayrollDisclosureChange = vi.fn();

  function ControlledFixture() {
    const [currentForm, setCurrentForm] = useState(form);

    function updateValue(id: string, value: string) {
      onValueChange(id, value);
      setCurrentForm((current) => {
        const sections = current.sections.map((section) => ({
          ...section,
          fields: section.fields.map((field) =>
            field.id === id ? { ...field, value } : field,
          ),
        }));
        if (!current.payroll) return { ...current, sections };

        return {
          ...current,
          sections,
          payroll: {
            ...current.payroll,
            fields: current.payroll.fields.map((field) =>
              field.id === id ? { ...field, value } : field,
            ),
          },
        };
      });
    }

    function updatePayrollDisclosure(enabled: boolean) {
      onPayrollDisclosureChange(enabled);
      setCurrentForm((current) =>
        current.payroll
          ? { ...current, payroll: { ...current.payroll, enabled } }
          : current,
      );
    }

    return (
      <InputsPanel
        fields={[]}
        form={currentForm}
        onPayrollDisclosureChange={updatePayrollDisclosure}
        onPenceValueChange={onPenceValueChange}
        onStatusChange={onStatusChange}
        onValueChange={updateValue}
      />
    );
  }

  render(<ControlledFixture />);

  return {
    onPayrollDisclosureChange,
    onPenceValueChange,
    onStatusChange,
    onValueChange,
  };
}

describe('InputsPanel', () => {
  it('sends the typed value and exact integer-pence payload for a money input', async () => {
    const user = userEvent.setup();
    const { onPenceValueChange, onValueChange } = renderFixture();
    const input = screen.getByRole('textbox', { name: 'Base salary' });

    await user.clear(input);
    await user.type(input, '12,345.67');

    expect(onValueChange).toHaveBeenLastCalledWith('base-salary', '12,345.67');
    expect(onPenceValueChange).toHaveBeenLastCalledWith(
      'base-salary',
      1_234_567,
    );
  });

  it('exposes forecast/actual controls and the full-bonus sacrifice choice', async () => {
    const user = userEvent.setup();
    const { onStatusChange, onValueChange } = renderFixture();
    await user.selectOptions(
      screen.getAllByLabelText('Forecast or actual')[0]!,
      'actual',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Sacrifice the full bonus' }),
    );

    expect(onStatusChange).toHaveBeenCalledWith(
      'bonus-guide-percentage',
      'actual',
    );
    expect(onValueChange).toHaveBeenCalledWith('sacrifice-full-bonus', 'true');
  });

  it('discloses PAYE fields by keyboard and presents their dependencies', async () => {
    const user = userEvent.setup();
    const { onPayrollDisclosureChange } = renderFixture();
    const disclosure = screen.getByRole('checkbox', {
      name: 'Add PAYE details',
    });

    expect(screen.queryByLabelText('PAYE tax code')).not.toBeInTheDocument();
    disclosure.focus();
    await user.keyboard(' ');

    expect(onPayrollDisclosureChange).toHaveBeenCalledWith(true);
    expect(screen.getByLabelText('PAYE tax code')).toBeInTheDocument();
    expect(
      screen.getByText(/month 1 \/ week 1 does not use year-to-date/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Year-to-date taxable pay'),
    ).toBeInTheDocument();
  });

  it('uses the supplied payroll disclosure state after an import-like form replacement', () => {
    const importedForm: PlannerInputsForm = {
      ...plannerInputsFixture,
      payroll: {
        ...plannerInputsFixture.payroll!,
        enabled: true,
        fields: plannerInputsFixture.payroll!.fields.map((field) =>
          field.id === 'payroll-tax-code'
            ? { ...field, value: '1257L' }
            : field,
        ),
      },
    };

    renderFixture(importedForm);

    expect(
      screen.getByRole('checkbox', { name: 'Add PAYE details' }),
    ).toBeChecked();
    expect(screen.getByLabelText('PAYE tax code')).toHaveValue('1257L');
  });

  it('associates validation summary and inline errors with required fields', async () => {
    const user = userEvent.setup();
    const invalidForm: PlannerInputsForm = {
      ...plannerInputsFixture,
      sections: plannerInputsFixture.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) =>
          field.id === 'target-ani' ? { ...field, value: '' } : field,
        ),
      })),
    };
    renderFixture(invalidForm);

    await user.click(screen.getByRole('button', { name: 'Review inputs' }));

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
      'Target adjusted net income',
    );
    expect(screen.getByLabelText('Target adjusted net income')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Target adjusted net income')).toHaveFocus();
    expect(screen.getAllByText('Units: pounds (£)')).not.toHaveLength(0);
  });
});
