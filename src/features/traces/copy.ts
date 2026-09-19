/** Labels for calculation-owned trace codes. Values and totals remain supplied. */
export const traceCopy: Readonly<Record<string, string>> = {
  adjustedNetIncome: 'Adjusted net income',
  baseSalary: 'Base salary',
  bonusIncome: 'Bonus income',
  employeeNationalInsurance: 'Employee National Insurance',
  employerPensionContribution: 'Employer pension contribution',
  equityIncome: 'Equity income',
  giftAidGrossDonation: 'Gross Gift Aid donation',
  incomeTax: 'Income Tax',
  incomeTaxBand: 'Income Tax band',
  nationalInsuranceBand: 'National Insurance band',
  otherTaxableIncome: 'Other taxable income',
  pension: 'Pension input',
  personalAllowance: 'Personal Allowance',
  regularSalarySacrifice: 'Regular salary sacrifice',
  bonusSalarySacrifice: 'Bonus salary sacrifice',
  sippGrossContribution: 'Gross SIPP contribution',
  sippNetContribution: 'Net SIPP contribution',
  taxableBenefits: 'Taxable benefits',
  taxableIncome: 'Taxable income',
  totalPensionInput: 'Total pension input',
};

export function traceLabel(
  code: string | undefined,
  label: string | undefined,
) {
  if (label) return label;
  if (code && traceCopy[code]) return traceCopy[code];
  return code ? `Calculation item (${code})` : 'Calculation item';
}
