import type { PlannerInputField } from './InputsPanel';

export const inputsFixture: readonly PlannerInputField[] = [
  {
    id: 'base-salary',
    label: 'Base salary',
    value: '120000',
    helpText: 'Annual contractual salary before salary sacrifice.',
  },
  {
    id: 'annual-bonus',
    label: 'Annual bonus',
    value: '12000',
    helpText: 'Expected taxable bonus for the selected tax year.',
    status: 'forecast',
  },
  {
    id: 'taxable-benefits',
    label: 'Taxable benefits',
    value: '1200',
    helpText: 'Annual taxable value of benefits in kind.',
    status: 'actual',
  },
];
