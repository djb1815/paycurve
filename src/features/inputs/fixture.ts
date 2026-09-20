import type { PlannerInputField, PlannerInputsForm } from './InputsPanel';

const money = (
  id: string,
  label: string,
  value: string,
  helpText: string,
  options: Partial<PlannerInputField> = {},
): PlannerInputField => ({
  id,
  label,
  value,
  helpText,
  control: 'money',
  unit: 'pounds (£)',
  ...options,
});

/** Representative, non-calculated values for the F00 shell and component work. */
export const plannerInputsFixture: PlannerInputsForm = {
  sections: [
    {
      id: 'employment-income',
      title: 'Employment income',
      description:
        'Include salary, bonus, equity income, and taxable benefits expected in this tax year.',
      fields: [
        money(
          'base-salary',
          'Base salary',
          '120000',
          'Annual contractual salary before salary sacrifice.',
          { required: true },
        ),
        {
          id: 'bonus-guide-percentage',
          label: 'Bonus guide',
          value: '10',
          helpText:
            'Expected bonus as a percentage of base salary. An override below takes precedence.',
          control: 'percentage',
          unit: 'percent (%)',
          status: 'forecast',
        },
        money(
          'bonus-override',
          'Bonus amount override',
          '',
          'A specific expected taxable bonus, if known.',
          { status: 'forecast' },
        ),
        money(
          'equity-income',
          'RSU and share income',
          '0',
          'Taxable value of shares expected to vest in this tax year.',
          { status: 'forecast' },
        ),
        money(
          'taxable-benefits',
          'Taxable benefits',
          '1200',
          'Annual taxable value of benefits in kind.',
          { status: 'actual' },
        ),
      ],
    },
    {
      id: 'other-taxable-income',
      title: 'Other taxable income',
      description: 'Enter taxable income not included in employment pay.',
      fields: [
        money(
          'savings-interest',
          'Savings interest',
          '0',
          'Taxable interest. It can affect adjusted net income even where an allowance reduces tax.',
          { status: 'forecast' },
        ),
        money(
          'other-taxable-income',
          'Other taxable income',
          '0',
          'Other taxable income not represented above.',
          { status: 'forecast' },
        ),
      ],
    },
    {
      id: 'pension-and-adjustments',
      title: 'Pension and ANI adjustments',
      description:
        'Enter cash amounts actually paid or sacrificed during the tax year.',
      fields: [
        money(
          'regular-salary-sacrifice',
          'Existing regular salary sacrifice',
          '0',
          'Annual regular salary already being sacrificed to pension.',
        ),
        money(
          'max-additional-regular-salary-sacrifice',
          'Maximum additional regular salary sacrifice',
          '0',
          'Required ceiling for optimisation and chart sampling. A new plan starts at zero.',
          { required: true },
        ),
        {
          id: 'sacrifice-full-bonus',
          label: 'Sacrifice the full bonus',
          value: 'false',
          helpText: 'Use the full expected bonus as bonus salary sacrifice.',
          control: 'checkbox',
          unit: 'choice',
        },
        money(
          'bonus-salary-sacrifice',
          'Bonus salary sacrifice',
          '0',
          'Amount of the expected bonus to sacrifice. It cannot exceed the bonus.',
        ),
        money(
          'sipp-net-contribution',
          'SIPP contribution paid',
          '0',
          'Net cash paid into a relief-at-source pension. The annual model applies basic-rate gross-up.',
        ),
        money(
          'gift-aid-cash-donation',
          'Gift Aid donation',
          '0',
          'Cash donated through Gift Aid. The annual model applies basic-rate gross-up.',
        ),
        money(
          'employer-pension-contribution',
          'Employer pension contribution',
          '0',
          'Annual employer contribution used for pension allowance monitoring.',
        ),
      ],
    },
    {
      id: 'planning-target',
      title: 'Planning target',
      description:
        'This is your own ANI target, separate from the statutory threshold.',
      fields: [
        money(
          'target-ani',
          'Target adjusted net income',
          '100000',
          'Choose an annual ANI target. A lower target creates additional headroom.',
          { required: true },
        ),
      ],
    },
  ],
  payroll: {
    enabled: false,
    fields: [
      {
        id: 'payroll-tax-code',
        label: 'PAYE tax code',
        value: '',
        helpText: 'The tax code on your payslip, such as 1257L.',
        control: 'text',
        unit: 'PAYE code',
        required: true,
      },
      {
        id: 'payroll-tax-code-basis',
        label: 'Tax-code basis',
        value: 'cumulative',
        helpText:
          'Use the basis shown on your payslip. Month 1 / Week 1 does not use year-to-date figures.',
        control: 'select',
        unit: 'selection',
        options: [
          { label: 'Cumulative', value: 'cumulative' },
          { label: 'Month 1 / Week 1', value: 'month1Week1' },
        ],
        required: true,
      },
      {
        id: 'payroll-pay-frequency',
        label: 'Pay frequency',
        value: 'monthly',
        helpText: 'How often you are paid by this employer.',
        control: 'select',
        unit: 'selection',
        options: [
          { label: 'Monthly', value: 'monthly' },
          { label: 'Every four weeks', value: 'fourWeekly' },
          { label: 'Fortnightly', value: 'fortnightly' },
          { label: 'Weekly', value: 'weekly' },
        ],
        required: true,
      },
      money(
        'payroll-next-period-additional-gross-pay',
        'Next-period bonus or additional pay',
        '0',
        'Bonus or other taxable employment pay expected in the next payroll period.',
      ),
      {
        id: 'payroll-year-to-date-periods',
        label: 'Completed payroll periods',
        value: '',
        helpText: 'Number of completed pay periods in this tax year.',
        control: 'number',
        unit: 'periods',
        required: true,
      },
      money(
        'payroll-year-to-date-taxable-pay',
        'Year-to-date taxable pay',
        '',
        'Taxable pay shown on your latest payslip.',
        { required: true },
      ),
      money(
        'payroll-year-to-date-income-tax-paid',
        'Year-to-date Income Tax paid',
        '',
        'Income Tax paid shown on your latest payslip.',
        { required: true },
      ),
    ],
  },
};

/** Compatibility fixture retained for isolated component examples and tests. */
export const inputsFixture: readonly PlannerInputField[] =
  plannerInputsFixture.sections.flatMap((section) => section.fields);
