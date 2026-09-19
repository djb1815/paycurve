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
      'Find out which income and deductions HMRC uses when working out adjusted net income.',
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
      'Salary sacrifice and personal pension contributions have different payroll and tax-relief treatment.',
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
      'Gift Aid can affect adjusted net income and higher-rate tax relief; use the cash donation you made.',
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
];
