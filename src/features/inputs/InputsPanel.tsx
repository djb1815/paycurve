import { useId, useState } from 'react';

import styles from './InputsPanel.module.css';

export type InputCertainty = 'forecast' | 'actual';
export type InputControl =
  'money' | 'percentage' | 'text' | 'number' | 'select' | 'checkbox';

export interface PlannerInputOption {
  readonly label: string;
  readonly value: string;
}

/**
 * A presentational input field. Money values are entered in pounds; state owns
 * conversion to the integer-pence domain model through `onPenceValueChange`.
 */
export interface PlannerInputField {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly helpText: string;
  readonly status?: InputCertainty;
  readonly section?: string;
  readonly control?: InputControl;
  readonly unit?: string;
  readonly options?: readonly PlannerInputOption[];
  readonly required?: boolean;
  readonly error?: string;
}

export interface PlannerInputSection {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly PlannerInputField[];
}

export interface PlannerInputsForm {
  readonly sections: readonly PlannerInputSection[];
  readonly payroll?: {
    readonly enabled: boolean;
    readonly fields: readonly PlannerInputField[];
  };
}

export interface InputsPanelProps {
  /** Compatibility path for the F00 application shell. */
  readonly fields: readonly PlannerInputField[];
  /** Preferred grouped input model for T12 state selectors. */
  readonly form?: PlannerInputsForm;
  readonly onValueChange?: (id: string, value: string) => void;
  readonly onPenceValueChange?: (id: string, value: number | undefined) => void;
  readonly onStatusChange?: (id: string, status: InputCertainty) => void;
  readonly onPayrollDisclosureChange?: (enabled: boolean) => void;
}

interface FieldProps {
  readonly field: PlannerInputField;
  readonly invalidMessage: string | undefined;
  readonly onStatusChange: InputsPanelProps['onStatusChange'] | undefined;
  readonly onValueChange: InputsPanelProps['onValueChange'] | undefined;
  readonly onPenceValueChange:
    InputsPanelProps['onPenceValueChange'] | undefined;
}

function parsePoundsToPence(value: string): number | undefined {
  const normalised = value.trim().replaceAll(',', '');
  if (normalised === '') {
    return undefined;
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalised);
  if (match === null) {
    return undefined;
  }

  const pounds = Number(match[1]);
  const decimal = (match[2] ?? '').padEnd(2, '0');
  const pence = pounds * 100 + Number(decimal || '0');
  return Number.isSafeInteger(pence) ? pence : undefined;
}

function moneyIsInvalid(value: string): boolean {
  return value.trim() !== '' && parsePoundsToPence(value) === undefined;
}

function FormField({
  field,
  invalidMessage,
  onStatusChange,
  onValueChange,
  onPenceValueChange,
}: FieldProps) {
  const helpId = `${field.id}-help`;
  const errorId = `${field.id}-error`;
  const control = field.control ?? 'money';
  const isMoney = control === 'money';
  const error = field.error ?? invalidMessage;
  const describedBy = error ? `${helpId} ${errorId}` : helpId;

  function reportValue(value: string) {
    onValueChange?.(field.id, value);
    if (isMoney) {
      onPenceValueChange?.(field.id, parsePoundsToPence(value));
    }
  }

  return (
    <div className={styles.field}>
      {control === 'checkbox' ? (
        <label className={styles.checkboxLabel} htmlFor={field.id}>
          <input
            aria-describedby={describedBy}
            checked={field.value === 'true'}
            id={field.id}
            name={field.id}
            onChange={(event) =>
              reportValue(String(event.currentTarget.checked))
            }
            type="checkbox"
          />
          {field.label}
        </label>
      ) : (
        <label htmlFor={field.id}>{field.label}</label>
      )}

      {control === 'select' ? (
        <select
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          id={field.id}
          name={field.id}
          onChange={(event) => reportValue(event.currentTarget.value)}
          required={field.required}
          value={field.value}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : control !== 'checkbox' ? (
        <div className={isMoney ? styles.moneyInput : styles.inputWithUnit}>
          {isMoney ? <span aria-hidden="true">£</span> : null}
          <input
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            id={field.id}
            inputMode={
              isMoney || control === 'percentage' || control === 'number'
                ? 'decimal'
                : undefined
            }
            name={field.id}
            onChange={(event) => reportValue(event.currentTarget.value)}
            required={field.required}
            type="text"
            value={field.value}
          />
          {field.unit && !isMoney ? (
            <span className={styles.unit} id={`${field.id}-unit`}>
              {field.unit}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className={styles.unitLabel}>Units: {field.unit ?? 'pounds (£)'}</p>
      <p className={styles.help} id={helpId}>
        {field.helpText}
      </p>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {field.status ? (
        <label className={styles.status} htmlFor={`${field.id}-certainty`}>
          Forecast or actual
          <select
            id={`${field.id}-certainty`}
            name={`${field.id}-certainty`}
            onChange={(event) =>
              onStatusChange?.(
                field.id,
                event.currentTarget.value as InputCertainty,
              )
            }
            value={field.status}
          >
            <option value="forecast">Forecast</option>
            <option value="actual">Actual</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function InputsPanel({
  fields,
  form,
  onValueChange,
  onPenceValueChange,
  onStatusChange,
  onPayrollDisclosureChange,
}: InputsPanelProps) {
  const validationId = useId();
  const [submitted, setSubmitted] = useState(false);
  // The plan owns disclosure state. Keeping this controlled means an imported
  // payroll record opens immediately without a synchronising effect, and none
  // of its fields can be replaced by a component-local default.
  const payrollOpen = form?.payroll?.enabled ?? false;
  const sections = form?.sections ?? [
    {
      id: 'income-and-adjustments',
      title: 'Income and adjustments',
      description: 'Enter annual amounts in pounds.',
      fields,
    },
  ];
  const allFields = sections.flatMap((section) => section.fields);
  const basis = form?.payroll?.fields.find(
    (field) => field.id === 'payroll-tax-code-basis',
  )?.value;
  const payrollFields = (form?.payroll?.fields ?? []).filter(
    (field) =>
      !field.id.startsWith('payroll-year-to-date-') || basis === 'cumulative',
  );
  const validationFields = [
    ...allFields,
    ...(payrollOpen ? payrollFields : []),
  ];
  const fieldsWithErrors = validationFields.filter(
    (field) =>
      field.error ||
      (field.required && field.value.trim() === '') ||
      ((field.control ?? 'money') === 'money' && moneyIsInvalid(field.value)),
  );
  const invalidFields = submitted ? fieldsWithErrors : [];

  function validationMessage(field: PlannerInputField): string | undefined {
    if (field.error) return field.error;
    if (field.required && field.value.trim() === '') {
      return 'Enter a value for this required field.';
    }
    if ((field.control ?? 'money') === 'money' && moneyIsInvalid(field.value)) {
      return 'Enter a non-negative amount in pounds with no more than two decimal places.';
    }
    return undefined;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (fieldsWithErrors.length > 0) {
      document.getElementById(fieldsWithErrors[0]?.id ?? '')?.focus();
    }
  }

  function togglePayroll(enabled: boolean) {
    onPayrollDisclosureChange?.(enabled);
  }

  return (
    <section aria-labelledby="income-inputs-heading" className={styles.panel}>
      <header>
        <p className={styles.eyebrow}>Plan inputs</p>
        <h2 id="income-inputs-heading">Income and adjustments</h2>
        <p>
          Enter annual amounts in pounds. Calculations are connected by the
          planner state.
        </p>
      </header>

      <form
        aria-describedby={invalidFields.length > 0 ? validationId : undefined}
        noValidate
        onSubmit={handleSubmit}
      >
        {invalidFields.length > 0 ? (
          <div
            className={styles.validationSummary}
            id={validationId}
            role="alert"
            tabIndex={-1}
          >
            <h3>
              Check {invalidFields.length === 1 ? 'this input' : 'these inputs'}
            </h3>
            <ul>
              {invalidFields.map((field) => (
                <li key={field.id}>
                  <a href={`#${field.id}`}>
                    {field.label}: {validationMessage(field)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {sections.map((section) => (
          <fieldset className={styles.section} key={section.id}>
            <legend>{section.title}</legend>
            <p className={styles.sectionDescription}>{section.description}</p>
            {section.id === 'pension-and-adjustments' ? (
              <p className={styles.limitation} role="note">
                <strong>Important limitation:</strong> your employer and
                National Minimum Wage rules may prevent a salary-sacrifice
                amount that this planner can model. Confirm any change with your
                employer.
              </p>
            ) : null}
            <div className={styles.grid}>
              {section.fields.map((field) => (
                <FormField
                  field={field}
                  invalidMessage={
                    submitted ? validationMessage(field) : undefined
                  }
                  key={field.id}
                  onPenceValueChange={onPenceValueChange}
                  onStatusChange={onStatusChange}
                  onValueChange={onValueChange}
                />
              ))}
            </div>
          </fieldset>
        ))}

        {form?.payroll ? (
          <fieldset className={styles.section}>
            <legend>Optional payroll projection</legend>
            <p className={styles.sectionDescription}>
              These details enable a next-payslip estimate. They do not change
              the annual ANI plan.
            </p>
            <label className={styles.disclosure} htmlFor="show-payroll-details">
              <input
                checked={payrollOpen}
                id="show-payroll-details"
                onChange={(event) => togglePayroll(event.currentTarget.checked)}
                type="checkbox"
              />
              Add PAYE details
            </label>
            {payrollOpen ? (
              <div className={styles.grid}>
                {payrollFields.map((field) => (
                  <FormField
                    field={field}
                    invalidMessage={
                      submitted ? validationMessage(field) : undefined
                    }
                    key={field.id}
                    onPenceValueChange={onPenceValueChange}
                    onStatusChange={onStatusChange}
                    onValueChange={onValueChange}
                  />
                ))}
              </div>
            ) : null}
          </fieldset>
        ) : null}

        <button className={styles.reviewButton} type="submit">
          Review inputs
        </button>
      </form>
    </section>
  );
}
