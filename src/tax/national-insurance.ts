import type { CalculationTrace, TraceStep } from '../domain/calculation';
import type { BasisPoints, MoneyPence } from '../domain/money';
import type { TaxYearConfig } from './config/types';
import { amountAtRate } from './math';

export interface NationalInsuranceBandCalculation {
  readonly bandId: string;
  readonly earnings: MoneyPence;
  readonly contribution: MoneyPence;
  readonly rate: BasisPoints;
}

export interface EmployeeNationalInsuranceCalculation {
  readonly earnings: MoneyPence;
  readonly bands: readonly NationalInsuranceBandCalculation[];
  readonly contribution: MoneyPence;
  readonly trace: CalculationTrace;
}

/** Annual Class 1 primary NIC approximation; payroll-period calculation belongs in T05. */
export function calculateEmployeeNationalInsurance(
  annualEarnings: MoneyPence,
  config: TaxYearConfig,
): EmployeeNationalInsuranceCalculation {
  const earnings = Math.max(0, annualEarnings);
  const bands: NationalInsuranceBandCalculation[] = [];
  const steps: TraceStep[] = [];
  let contribution = 0;

  for (const band of config.nationalInsurance.class1EmployeeBands) {
    const upperBound = band.upperBound ?? earnings;
    const bandEarnings = Math.max(
      0,
      Math.min(earnings, upperBound) - band.lowerBound + 1,
    );
    const cappedBandEarnings =
      band.upperBound === null
        ? Math.max(0, earnings - band.lowerBound + 1)
        : bandEarnings;
    const bandContribution = amountAtRate(cappedBandEarnings, band.rate);
    contribution += bandContribution;
    bands.push({
      bandId: band.id,
      earnings: cappedBandEarnings,
      contribution: bandContribution,
      rate: band.rate,
    });
    steps.push({
      code: 'nationalInsuranceBand',
      operation: 'add',
      amount: bandContribution,
      rate: band.rate,
      parameters: { earnings: cappedBandEarnings },
    });
  }
  steps.push({
    code: 'employeeNationalInsurance',
    operation: 'result',
    amount: contribution,
    runningTotal: contribution,
  });

  return {
    earnings,
    bands,
    contribution,
    trace: { steps, total: contribution },
  };
}
