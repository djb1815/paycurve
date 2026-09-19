import type { CalculationIssue, ScenarioId } from '../domain';
import type { PlannerInputField, PlannerInputsForm } from '../features/inputs';
import type { PlannerStoreState } from '../state';

import { formatInputPounds } from './format';

export type EditableScenario = Exclude<ScenarioId, 'optimal'>;
export type RawValues = Readonly<Record<string, string>>;

function valueFor(rawValues: RawValues, id: string, value: number): string {
  return rawValues[id] ?? formatInputPounds(value);
}

function inputError(
  issues: readonly CalculationIssue[],
  path: string,
): string | undefined {
  const issue = issues.find(
    (candidate) => candidate.path === path && candidate.severity === 'error',
  );
  if (!issue) return undefined;
  switch (issue.code) {
    case 'additionalSacrificeExceedsCap':
      return 'This amount exceeds the selected additional salary-sacrifice limit.';
    case 'bonusSacrificeExceedsBonus':
      return 'Bonus sacrifice cannot exceed the expected bonus.';
    case 'regularSacrificeExceedsSalary':
      return 'Regular salary sacrifice cannot exceed base salary.';
    case 'invalidPercentage':
      return 'Enter a percentage from 0% to 100%.';
    case 'invalidTarget':
      return 'Enter a positive ANI target.';
    default:
      return 'Enter a non-negative whole-penny amount.';
  }
}

export function inputForm(
  state: PlannerStoreState,
  editableScenario: EditableScenario,
  rawValues: RawValues,
): PlannerInputsForm {
  const { facts } = state.plan;
  const allocation = state.plan[editableScenario];
  const issues = state.validationIssues;
  const field = (
    id: string,
    label: string,
    value: string,
    helpText: string,
    extra: Partial<PlannerInputField> = {},
  ): PlannerInputField => ({ id, label, value, helpText, ...extra });
  const moneyField = (
    id: string,
    label: string,
    value: number,
    helpText: string,
    path: string,
    extra: Partial<PlannerInputField> = {},
  ) => {
    const error = inputError(issues, path);
    return field(id, label, valueFor(rawValues, id, value), helpText, {
      control: 'money',
      unit: 'pounds (£)',
      ...(error === undefined ? {} : { error }),
      ...extra,
    });
  };
  const allocationPath = editableScenario;
  const bonusIncome =
    state.derived.current.projection.traces.adjustedNetIncome.steps.find(
      (step) => step.code === 'bonusIncome',
    )?.amount ?? 0;
  const payroll = facts.payroll;
  const bonusGuideError = inputError(issues, 'facts.bonus.guidePercentage');

  return {
    sections: [
      {
        id: 'employment-income',
        title: 'Employment income',
        description:
          'Include salary, bonus, equity income, and taxable benefits expected in this tax year.',
        fields: [
          moneyField(
            'base-salary',
            'Base salary',
            facts.baseSalary,
            'Annual contractual salary before salary sacrifice.',
            'facts.baseSalary',
            { required: true },
          ),
          field(
            'bonus-guide-percentage',
            'Bonus guide',
            String(facts.bonus.guidePercentage / 100),
            'Expected bonus as a percentage of base salary. An override below takes precedence.',
            {
              control: 'percentage',
              unit: 'percent (%)',
              ...(bonusGuideError === undefined
                ? {}
                : { error: bonusGuideError }),
            },
          ),
          moneyField(
            'bonus-override',
            'Bonus amount override',
            facts.bonus.amountOverride?.amount ?? 0,
            'A specific expected taxable bonus, if known.',
            'facts.bonus.amountOverride.amount',
            {
              status: facts.bonus.amountOverride?.certainty ?? 'forecast',
              value:
                rawValues['bonus-override'] ??
                (facts.bonus.amountOverride
                  ? formatInputPounds(facts.bonus.amountOverride.amount)
                  : ''),
            },
          ),
          moneyField(
            'equity-income',
            'RSU and share income',
            facts.equityIncome[0]?.amount ?? 0,
            'Taxable value of shares expected to vest in this tax year.',
            'facts.equityIncome.0.amount',
            { status: facts.equityIncome[0]?.certainty ?? 'forecast' },
          ),
          moneyField(
            'taxable-benefits',
            'Taxable benefits',
            facts.taxableBenefits.amount,
            'Annual taxable value of benefits in kind.',
            'facts.taxableBenefits.amount',
            { status: facts.taxableBenefits.certainty },
          ),
        ],
      },
      {
        id: 'other-taxable-income',
        title: 'Other taxable income',
        description: 'Enter taxable income not included in employment pay.',
        fields: [
          moneyField(
            'savings-interest',
            'Savings interest',
            facts.savingsInterest.amount,
            'Taxable interest can affect adjusted net income even where an allowance reduces tax.',
            'facts.savingsInterest.amount',
            { status: facts.savingsInterest.certainty },
          ),
          moneyField(
            'other-taxable-income',
            'Other taxable income',
            facts.otherTaxableIncome,
            'Other taxable income not represented above.',
            'facts.otherTaxableIncome',
          ),
        ],
      },
      {
        id: 'pension-and-adjustments',
        title: `${editableScenario === 'current' ? 'Current' : 'Alternative'} pension and adjustments`,
        description:
          'These values apply to the selected editable scenario. Optimal is derived and cannot be edited.',
        fields: [
          moneyField(
            'regular-salary-sacrifice',
            'Regular salary sacrifice',
            allocation.regularSalarySacrifice,
            'Annual regular salary sacrificed to pension in this scenario.',
            `${allocationPath}.regularSalarySacrifice`,
          ),
          moneyField(
            'max-additional-regular-salary-sacrifice',
            'Maximum additional regular salary sacrifice',
            state.plan.maxAdditionalRegularSalarySacrifice,
            'Required ceiling for optimisation and chart sampling. A new plan starts at zero.',
            'maxAdditionalRegularSalarySacrifice',
            { required: true },
          ),
          field(
            'sacrifice-full-bonus',
            'Sacrifice the full bonus',
            String(
              allocation.bonusSalarySacrifice === bonusIncome &&
                bonusIncome > 0,
            ),
            'Use the full expected bonus as bonus salary sacrifice for this scenario.',
            { control: 'checkbox', unit: 'choice' },
          ),
          moneyField(
            'bonus-salary-sacrifice',
            'Bonus salary sacrifice',
            allocation.bonusSalarySacrifice,
            'Amount of the expected bonus to sacrifice. It cannot exceed the bonus.',
            `${allocationPath}.bonusSalarySacrifice`,
          ),
          moneyField(
            'sipp-net-contribution',
            'SIPP contribution paid',
            allocation.sippNetContribution,
            'Net cash paid into a relief-at-source pension. The annual model applies basic-rate gross-up.',
            `${allocationPath}.sippNetContribution`,
          ),
          moneyField(
            'gift-aid-cash-donation',
            'Gift Aid donation',
            allocation.giftAidCashDonation,
            'Cash donated through Gift Aid. The annual model applies basic-rate gross-up.',
            `${allocationPath}.giftAidCashDonation`,
          ),
          moneyField(
            'employer-pension-contribution',
            'Employer pension contribution',
            facts.employerPensionContribution,
            'Annual employer contribution used for pension allowance monitoring.',
            'facts.employerPensionContribution',
          ),
        ],
      },
      {
        id: 'planning-target',
        title: 'Planning target',
        description:
          'This is your own ANI target, separate from the statutory threshold.',
        fields: [
          moneyField(
            'target-ani',
            'Target adjusted net income',
            state.plan.targetAni,
            'Choose an annual ANI target. A lower target creates additional headroom.',
            'targetAni',
            { required: true },
          ),
        ],
      },
    ],
    payroll: {
      enabled: payroll !== undefined,
      fields: [
        field(
          'payroll-tax-code',
          'PAYE tax code',
          rawValues['payroll-tax-code'] ?? payroll?.taxCode ?? '',
          'The tax code on your payslip, such as 1257L.',
          { control: 'text', required: true, unit: 'PAYE code' },
        ),
        field(
          'payroll-tax-code-basis',
          'Tax-code basis',
          payroll?.taxCodeBasis ?? 'cumulative',
          'Use the basis shown on your payslip. Month 1 / Week 1 does not use year-to-date figures.',
          {
            control: 'select',
            options: [
              { label: 'Cumulative', value: 'cumulative' },
              { label: 'Month 1 / Week 1', value: 'month1Week1' },
            ],
            required: true,
            unit: 'selection',
          },
        ),
        field(
          'payroll-pay-frequency',
          'Pay frequency',
          payroll?.payFrequency ?? 'monthly',
          'How often you are paid by this employer.',
          {
            control: 'select',
            options: [
              { label: 'Monthly', value: 'monthly' },
              { label: 'Every four weeks', value: 'fourWeekly' },
              { label: 'Fortnightly', value: 'fortnightly' },
              { label: 'Weekly', value: 'weekly' },
            ],
            required: true,
            unit: 'selection',
          },
        ),
        moneyField(
          'payroll-next-period-additional-gross-pay',
          'Next-period bonus or additional pay',
          payroll?.nextPeriodAdditionalGrossPay ?? 0,
          'Bonus or other taxable employment pay expected in the next payroll period.',
          'facts.payroll.nextPeriodAdditionalGrossPay',
        ),
        field(
          'payroll-year-to-date-periods',
          'Completed payroll periods',
          rawValues['payroll-year-to-date-periods'] ??
            String(payroll?.yearToDate?.completedPeriods ?? ''),
          'Number of completed pay periods in this tax year.',
          { control: 'number', required: true, unit: 'periods' },
        ),
        moneyField(
          'payroll-year-to-date-taxable-pay',
          'Year-to-date taxable pay',
          payroll?.yearToDate?.taxablePay ?? 0,
          'Taxable pay shown on your latest payslip.',
          'facts.payroll.yearToDate.taxablePay',
          {
            required: true,
            value:
              rawValues['payroll-year-to-date-taxable-pay'] ??
              (payroll?.yearToDate
                ? formatInputPounds(payroll.yearToDate.taxablePay)
                : ''),
          },
        ),
        moneyField(
          'payroll-year-to-date-income-tax-paid',
          'Year-to-date Income Tax paid',
          payroll?.yearToDate?.incomeTaxPaid ?? 0,
          'Income Tax paid shown on your latest payslip.',
          'facts.payroll.yearToDate.incomeTaxPaid',
          {
            required: true,
            value:
              rawValues['payroll-year-to-date-income-tax-paid'] ??
              (payroll?.yearToDate
                ? formatInputPounds(payroll.yearToDate.incomeTaxPaid)
                : ''),
          },
        ),
      ],
    },
  };
}
