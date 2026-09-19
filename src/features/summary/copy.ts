export type SummaryIssueSeverity = 'error' | 'warning' | 'information';
export type SummaryInsightSeverity = 'information' | 'positive' | 'warning';

export interface SummaryMessage {
  readonly code: string;
  readonly severity: SummaryIssueSeverity | SummaryInsightSeverity;
  readonly parameters?: Readonly<Record<string, number>>;
}

interface CopyEntry {
  readonly title: string;
  readonly description: (
    parameters: Readonly<Record<string, number>>,
  ) => string;
}

function amount(parameters: Readonly<Record<string, number>>, key: string) {
  const value = parameters[key];
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-GB', {
        currency: 'GBP',
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
        style: 'currency',
      }).format(Math.abs(value) / 100)
    : undefined;
}

/** Stable calculation issue codes mapped to deliberately short UI copy. */
export const issueCopy: Readonly<Record<string, CopyEntry>> = {
  additionalSacrificeExceedsCap: {
    title: 'Additional sacrifice exceeds the selected limit',
    description: () => 'Reduce the additional regular salary sacrifice amount.',
  },
  aniAboveStatutoryThreshold: {
    title: 'ANI is above the statutory threshold',
    description: (parameters) =>
      amount(parameters, 'headroom')
        ? `The plan is ${amount(parameters, 'headroom')} above the threshold.`
        : 'The plan is above the threshold.',
  },
  bonusSacrificeExceedsBonus: {
    title: 'Bonus sacrifice exceeds the bonus',
    description: () => 'Reduce the bonus sacrifice amount.',
  },
  forecastIncomePresent: {
    title: 'Forecast income is included',
    description: () => 'Results may change when forecast amounts become known.',
  },
  incompletePayrollInputs: {
    title: 'PAYE estimate is unavailable',
    description: () =>
      'Add the required payroll details to see a PAYE-aware estimate.',
  },
  invalidPercentage: {
    title: 'A percentage is not valid',
    description: () => 'Use a value from 0% to 100%.',
  },
  invalidTarget: {
    title: 'The ANI target is not valid',
    description: () => 'Enter a non-negative target amount.',
  },
  negativeAmount: {
    title: 'An amount cannot be negative',
    description: () => 'Correct the amount before relying on the result.',
  },
  pensionAllowanceApproached: {
    title: 'Pension annual allowance is close',
    description: () =>
      'Check the pension input against your available allowance.',
  },
  pensionAllowanceExceeded: {
    title: 'Pension annual allowance may be exceeded',
    description: () =>
      'Check the pension input and any available carry forward.',
  },
  pensionAllowanceLimitations: {
    title: 'Pension allowance checks are limited',
    description: () =>
      'This planner does not model every allowance adjustment.',
  },
  regularSacrificeExceedsSalary: {
    title: 'Regular sacrifice exceeds salary',
    description: () => 'Reduce regular salary sacrifice.',
  },
  salarySacrificeLimitations: {
    title: 'Check salary-sacrifice restrictions',
    description: () =>
      'Employer and minimum-wage restrictions are not fully modelled.',
  },
  smallTargetHeadroom: {
    title: 'Target headroom is small',
    description: (parameters) =>
      amount(parameters, 'headroom')
        ? `Only ${amount(parameters, 'headroom')} remains below the target.`
        : 'Only a small amount remains below the target.',
  },
  unsupportedTaxCode: {
    title: 'Tax code is not supported',
    description: () =>
      'Use the annual estimate or provide a supported PAYE tax code.',
  },
};

/** Stable insight codes mapped to display copy; amounts remain calculation-owned. */
export const insightCopy: Readonly<Record<string, CopyEntry>> = {
  additionalSacrificeRequired: {
    title: 'Additional sacrifice may be needed',
    description: (parameters) =>
      amount(parameters, 'amount')
        ? `Consider ${amount(parameters, 'amount')} more regular salary sacrifice.`
        : 'Consider additional regular salary sacrifice.',
  },
  aniAboveTarget: {
    title: 'ANI is above the selected target',
    description: () =>
      'The selected scenario does not currently meet the target.',
  },
  aniBelowTarget: {
    title: 'ANI is at or below the selected target',
    description: () => 'The selected scenario currently meets the target.',
  },
  averagePeriodCashChange: {
    title: 'Average-period cash changes',
    description: () =>
      'Compare average net employment pay and disposable cash separately.',
  },
  effectiveContributionCost: {
    title: 'Pension contribution changes cash',
    description: () =>
      'The supplied comparison shows the estimated cash effect.',
  },
  forecastHeadroom: {
    title: 'Forecast amounts affect headroom',
    description: () =>
      'Headroom may change when forecast income becomes actual.',
  },
  fullBonusSacrificeInsufficient: {
    title: 'Bonus sacrifice alone is insufficient',
    description: () =>
      'The supplied bonus sacrifice does not meet the target by itself.',
  },
  fullBonusSacrificeSufficient: {
    title: 'Bonus sacrifice could meet the target',
    description: () =>
      'The supplied model indicates the bonus could provide enough reduction.',
  },
  nearStatutoryThreshold: {
    title: 'ANI is close to a statutory threshold',
    description: () =>
      'Small income changes could affect the threshold position.',
  },
  payeAwareCash: {
    title: 'PAYE-aware estimate is available',
    description: () =>
      'This is a projected next-payslip estimate, not reconciliation.',
  },
  pensionAllowanceHeadroom: {
    title: 'Pension allowance headroom is available',
    description: () => 'Check it against your personal pension circumstances.',
  },
  personalAllowanceRestored: {
    title: 'Personal Allowance is restored in this scenario',
    description: () =>
      'The supplied annual projection includes the restored allowance.',
  },
};

export function messageCopy(
  message: SummaryMessage,
  copy: Readonly<Record<string, CopyEntry>>,
) {
  const entry = copy[message.code];
  if (entry) {
    return {
      description: entry.description(message.parameters ?? {}),
      title: entry.title,
    };
  }

  return {
    description:
      'The calculation supplied a message that this version of the interface cannot describe in more detail.',
    title: `Calculation notice (${message.code})`,
  };
}
