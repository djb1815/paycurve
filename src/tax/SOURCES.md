# 2026/27 Tax Configuration Sources

Retrieved 19 September 2026. The application supports only England, Wales, and
Northern Ireland Income Tax treatment, standard employee Class 1 NICs, and the
limited pension annual-allowance monitoring described below.

| Configuration values                                                                                                                                                                            | Authoritative source                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal Allowance £12,570; taper begins at £100,000 ANI at £1 for every £2; basic rate band £37,700 at 20%; higher-rate band £87,440 at 40%; additional rate 45%; starting savings rate £5,000 | [Income Tax rates and allowances for current and previous tax years — GOV.UK](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past) |
| Employee Class 1 NIC primary threshold £12,570, upper earnings limit £50,270; 8% main and 2% additional rate                                                                                    | [Rates and thresholds for employers 2026 to 2027 — GOV.UK](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027)                                                                    |
| Standard pension annual allowance £60,000                                                                                                                                                       | [Pension schemes rates — GOV.UK](https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates)                                                                    |
| Relief-at-source basic-rate tax relief: a £80 payment becomes a £100 pension contribution                                                                                                       | [Reclaim tax relief for pension scheme members with relief at source — GOV.UK](https://www.gov.uk/guidance/pension-administrators-reclaim-tax-relief-using-relief-at-source)                               |
| Gross Gift Aid and relief-at-source pension payments extend both the basic-rate and higher-rate limits                                                                                          | [PTM056120 — Annual allowance: tax charge: rate of tax charge: terms used — HMRC manual](https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm056120)                                           |
| ANI includes savings interest and employment benefits, and subtracts grossed-up Gift Aid and relief-at-source pension contributions                                                             | [Personal Allowances: adjusted net income — GOV.UK](https://www.gov.uk/guidance/adjusted-net-income)                                                                                                       |
| Childcare ANI threshold £100,000                                                                                                                                                                | [Free Childcare for Working Parents: Check if you're eligible — GOV.UK](https://www.gov.uk/free-childcare-if-working/check-youre-eligible)                                                                 |

The Personal Savings Allowance values are £1,000 for basic-rate taxpayers,
£500 for higher-rate taxpayers, and £0 for additional-rate taxpayers. They are
stated on the Income Tax rates page above. The `allowanceWarningMargin` of
£5,000 is a product warning threshold rather than a tax-policy value.

## Calculation conventions

- Monetary inputs and results are integer pence; rates are integer basis points.
- Percentage calculations round a fractional penny half up, once per reported
  tax or NIC band. This is an annual planning convention, not PAYE
  reconciliation. Personal Allowance is rounded only after its half-rate taper
  is applied, so a penny either side of the published exhaustion threshold has
  a predictable result. T05 is responsible for payroll-period rounding.
- Annual Class 1 NIC bands are represented with inclusive pence bounds so a
  penny exactly at the primary threshold remains at 0%, and the next penny is
  charged at the main rate.
- Pension monitoring compares modelled salary sacrifice, relief-at-source SIPP
  gross contributions, and employer contributions with the standard allowance.
  It does not model tapering, carry-forward, MPAA, defined-benefit inputs, or
  earnings limits.
