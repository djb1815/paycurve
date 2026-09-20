export interface HelpTopic {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly links: readonly {
    readonly label: string;
    readonly href: string;
  }[];
}

/** Static references only: help must never receive or display plan data. */
export const defaultHelpTopics: readonly HelpTopic[] = [
  {
    id: 'adjusted-net-income',
    title: 'Adjusted net income',
    summary:
      'ANI starts with taxable income and adjusts it for eligible pension contributions and Gift Aid. It is used for some tax charges and eligibility tests.',
    links: [
      {
        label: 'HMRC: adjusted net income',
        href: 'https://www.gov.uk/guidance/adjusted-net-income',
      },
    ],
  },
  {
    id: 'pension-tax-relief',
    title: 'Pension tax relief',
    summary:
      'Salary sacrifice reduces contractual employment pay before payroll. A SIPP paid under relief at source is entered as the cash paid: the planner grosses it up at the basic rate for ANI planning.',
    links: [
      {
        label: 'GOV.UK: tax on private pensions',
        href: 'https://www.gov.uk/tax-on-private-pension-contributions',
      },
      {
        label: 'HMRC: salary sacrifice',
        href: 'https://www.gov.uk/guidance/salary-sacrifice-and-the-effects-on-paye',
      },
    ],
  },
  {
    id: 'gift-aid',
    title: 'Gift Aid',
    summary:
      'Enter the cash donation you made. Gift Aid is grossed up at the basic rate for ANI and can support higher-rate relief, while the cash payment still reduces disposable cash.',
    links: [
      {
        label: 'GOV.UK: tax relief when donating to charity',
        href: 'https://www.gov.uk/donating-to-charity/gift-aid',
      },
    ],
  },
  {
    id: 'childcare',
    title: 'Childcare eligibility',
    summary:
      'Eligibility is assessed for each parent and can depend on more than adjusted net income.',
    links: [
      {
        label: 'GOV.UK: Free Childcare for Working Parents',
        href: 'https://www.gov.uk/free-childcare-if-working',
      },
      {
        label: 'GOV.UK: Tax-Free Childcare',
        href: 'https://www.gov.uk/tax-free-childcare',
      },
    ],
  },
  {
    id: 'target-and-threshold',
    title: 'Planning target and statutory threshold',
    summary:
      'Your target is a planning choice. A statutory threshold is a separate eligibility rule, so leave headroom for uncertain income where appropriate.',
    links: [
      {
        label: 'HMRC: adjusted net income',
        href: 'https://www.gov.uk/guidance/adjusted-net-income',
      },
      {
        label: 'GOV.UK: Free Childcare for Working Parents',
        href: 'https://www.gov.uk/free-childcare-if-working',
      },
    ],
  },
  {
    id: 'personal-allowance-taper',
    title: 'Personal Allowance taper',
    summary:
      'For adjusted net income above £100,000, the Personal Allowance is reduced by £1 for every £2 of income above that level. The planner shows this as an annual estimate, not tax advice.',
    links: [
      {
        label: 'GOV.UK: Income Tax rates and Personal Allowances',
        href: 'https://www.gov.uk/income-tax-rates',
      },
    ],
  },
  {
    id: 'salary-and-bonus-sacrifice',
    title: 'Salary and bonus sacrifice',
    summary:
      'Salary and bonus sacrifice reduce employment pay before it is received, but employer rules and National Minimum Wage restrictions can limit what is possible.',
    links: [
      {
        label: 'HMRC: salary sacrifice and PAYE',
        href: 'https://www.gov.uk/guidance/salary-sacrifice-and-the-effects-on-paye',
      },
    ],
  },
  {
    id: 'taxable-income-details',
    title: 'Taxable benefits, savings interest, and RSUs',
    summary:
      'Benefits in kind, taxable savings interest, and taxable value from RSU or other share vests can affect ANI even if another allowance changes the tax ultimately due. Record each vest event separately where its timing or certainty differs.',
    links: [
      {
        label: 'HMRC: adjusted net income',
        href: 'https://www.gov.uk/guidance/adjusted-net-income',
      },
      {
        label: 'GOV.UK: tax on savings interest',
        href: 'https://www.gov.uk/apply-tax-free-interest-on-savings',
      },
      {
        label: 'GOV.UK: tax and employee share schemes',
        href: 'https://www.gov.uk/tax-employee-share-schemes',
      },
    ],
  },
  {
    id: 'pension-annual-allowance',
    title: 'Pension annual allowance',
    summary:
      'The planner can warn against the configured standard annual allowance, but it does not model tapered allowance, carry forward, defined-benefit pension inputs, or the Money Purchase Annual Allowance.',
    links: [
      {
        label: 'GOV.UK: tax on private pension contributions',
        href: 'https://www.gov.uk/tax-on-private-pension-contributions',
      },
    ],
  },
  {
    id: 'forecast-and-actual',
    title: 'Forecast and actual values',
    summary:
      'Mark an amount as forecast until it is known. Forecast income can leave less headroom than expected, so update bonus, equity, benefits, and savings figures as actual values become available.',
    links: [
      {
        label: 'HMRC: adjusted net income',
        href: 'https://www.gov.uk/guidance/adjusted-net-income',
      },
    ],
  },
  {
    id: 'paye-and-cash',
    title: 'PAYE projection and cash measures',
    summary:
      'The annual estimate is the planning source of truth. A PAYE-aware next-payslip estimate needs payroll details and can differ from an average period amount because PAYE is calculated by pay period. Cumulative codes use year-to-date pay and tax; Month 1 / Week 1 codes do not. Net employment pay and disposable cash are separate because SIPP and Gift Aid are cash payments.',
    links: [
      {
        label: 'GOV.UK: tax codes',
        href: 'https://www.gov.uk/tax-codes',
      },
      {
        label: 'GOV.UK: understanding your payslip',
        href: 'https://www.gov.uk/payslips',
      },
    ],
  },
];
