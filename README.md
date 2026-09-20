# Paycurve

Paycurve is a browser-based UK adjusted net income planner. It helps you
explore how salary sacrifice, bonus sacrifice, personal pension contributions,
and Gift Aid could affect:

- adjusted net income and headroom below a chosen target;
- Income Tax and employee National Insurance;
- net employment pay, disposable cash, and pension funding;
- Current, Optimal, and Alternative scenarios; and
- an optional PAYE-aware next-payslip estimate.

The MVP models one PAYE employment for the 2026/27 tax year using the main
Income Tax rates for England, Wales, and Northern Ireland. Scottish Income Tax
and more complex tax circumstances are outside its scope.

## Run locally

The project uses [mise](https://mise.jdx.dev/) to provide the pinned Bun and
Node.js versions.

```sh
mise install
mise run setup
mise run dev
```

Open the local address printed by Vite, normally
`http://localhost:5173/`.

Plan data stays in your browser. There is no backend, account, telemetry, or
remote plan storage. Exported plan files contain sensitive financial data and
should be stored and shared carefully.

## Development commands

```sh
mise run test        # Run the test suite once
mise run test-watch  # Run tests in watch mode
mise run check       # Format check, lint, type-check, test, and build
mise run build       # Create a production build in dist/
```

The product design is documented in [`docs/DESIGN.md`](docs/DESIGN.md), the
implementation workstreams in [`docs/TASKS.md`](docs/TASKS.md), and current
release evidence in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## Accuracy and financial disclaimer

Paycurve is an educational planning and visualisation tool. It is not tax,
financial, legal, pension, payroll, or benefits advice. Its results are
estimates based on the information entered, the configured tax rules, and the
documented modelling assumptions. They may be incomplete, incorrect, or become
out of date.

The annual projection is not a tax return calculation. The PAYE-aware result is
not payslip reconciliation and does not model every tax code, deduction, pension
rule, employer restriction, or individual circumstance. In particular, the app
does not determine whether a proposed salary sacrifice complies with National
Minimum Wage rules or an employer's scheme, and its pension allowance warning
does not model every allowance restriction or carry-forward case.

Do not rely on Paycurve alone for financial decisions or eligibility claims.
Check figures against current HMRC and GOV.UK guidance, confirm salary-sacrifice
changes with your employer, and seek qualified professional advice where
appropriate. You remain responsible for verifying all inputs, assumptions, and
outputs.
