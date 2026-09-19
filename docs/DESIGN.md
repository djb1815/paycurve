# DESIGN.md — UK Adjusted Net Income Planner

## 1. Purpose

This project is a small, client-side web application for projecting UK adjusted net income (ANI) and exploring how pension salary sacrifice, bonus sacrifice, personal pension contributions, and Gift Aid affect:

- adjusted net income;
- take-home pay;
- Income Tax;
- employee National Insurance;
- pension contributions;
- projected monthly take-home pay;
- headroom below a chosen ANI target; and
- eligibility-sensitive thresholds, especially the £100,000 ANI limit relevant to Free Childcare for Working Parents and Tax-Free Childcare.

The application is primarily a personal planning and visualisation tool. It may be open sourced, but public hosting and multi-user operation are not MVP goals.

The core question is:

> Given my expected income for the tax year, how much should I allocate to salary sacrifice and other ANI-reducing options in order to reach a chosen ANI target, and what are the financial effects across the available range?

The application should make the trade-off visible rather than merely calculate ANI after the user has already chosen a pension contribution.

---

## 2. Design Principles

### 2.1 Visualise the decision

The primary experience should show the effect of changing pension salary sacrifice across a range of values. The user should be able to see important breakpoints and inspect individual points rather than repeatedly entering amounts into a calculator.

### 2.2 Explain, not merely calculate

Where useful information can be derived from the supplied inputs, the application should surface it.

Examples include:

- projected ANI before additional sacrifice;
- amount above or below the target;
- minimum additional sacrifice required;
- equivalent recurring sacrifice over the remainder of the tax year;
- whether full bonus sacrifice is sufficient;
- remaining headroom for uncertain income;
- tax and NI saved by additional sacrifice;
- Personal Allowance restored;
- effective take-home cost of pension contributions; and
- warnings when the plan is too close to the target given forecast income.

Important figures should have an expandable calculation trace.

### 2.3 Make omissions difficult

Inputs that are easy to forget but relevant to ANI should be explicit rather than hidden behind a generic field. In particular:

- taxable benefits;
- savings interest;
- RSU/equity income;
- bonus income; and
- other taxable income.

Helpful tooltips should explain why each field matters.

### 2.4 Keep tax logic independent of UI

The tax and projection model should be implemented as pure TypeScript functions with no React dependency.

The UI should consume model outputs rather than contain tax calculations.

### 2.5 Prefer transparent assumptions

The application is a planning tool, not tax advice. Assumptions and unsupported cases should be visible rather than silently approximated.

### 2.6 Keep financial data local

MVP operation should require no backend, account, remote persistence, telemetry, or server-side storage.

### 2.7 Separate annual planning from payroll projection

The annual ANI/tax model is the source of truth for optimisation.

Monthly take-home should be presented at two levels:

- an always-available estimated average monthly take-home derived from the annual projection; and
- an optional PAYE-aware monthly projection when sufficient payroll inputs are supplied.

The app should not imply payslip-level precision when it only has annual inputs.

---

## 3. MVP Scope

### 3.1 Supported tax jurisdiction

MVP supports taxpayers subject to the main UK Income Tax rates used in England, Wales, and Northern Ireland.

Scottish Income Tax is out of scope for MVP.

### 3.2 Supported tax year

The initial implementation targets tax year **2026/27**.

Tax rules must be represented through a versioned tax-year configuration so later years can be added without rewriting calculation logic.

The application should never rely on an implicit "current tax year".

### 3.3 Employment model

MVP assumes:

- one PAYE employment;
- no self-employment;
- no rental/property income model beyond an optional generic taxable-income field;
- no complex foreign-income treatment;
- no student-loan modelling;
- no marriage allowance or other household tax optimisation.

The childcare ANI limit applies separately to each partner. MVP models one person's finances only.

---

## 4. Income Inputs

The application should provide dedicated inputs for the following annual amounts.

### 4.1 Base salary

Annual contractual gross salary before salary sacrifice.

### 4.2 Regular salary sacrifice

Existing recurring pension salary sacrifice.

The application should support both:

- an annual amount; and
- a monthly equivalent in the UI where useful.

The model should distinguish between the amount already committed and additional sacrifice being explored.

### 4.3 Annual bonus

The bonus should be a first-class income component.

Inputs:

- expected/guide bonus percentage of base salary;
- automatically derived guide amount;
- optional manual expected/actual amount override;
- bonus sacrifice amount or percentage;
- forecast/actual status.

The UI should make 100% bonus sacrifice easy to represent.

### 4.4 RSU / taxable equity income

Expected employment income arising from RSU or other taxable equity vesting.

MVP may initially accept a total annual amount, but the domain model should permit multiple vest events later.

Useful future fields:

- vest date;
- forecast value;
- actual taxable value;
- forecast/actual status.

RSUs are income inputs, not a salary-sacrifice allocation lever.

### 4.5 Taxable benefits

Dedicated annual input for taxable benefits / benefits in kind.

This should not be folded into "other income", because it is easy to overlook.

### 4.6 Savings interest

Dedicated annual input for taxable savings interest.

The tooltip should make clear that ANI begins from taxable income and that savings income may matter even where the Personal Savings Allowance reduces the eventual tax payable.

### 4.7 Other taxable income

A catch-all field for taxable income not otherwise represented.

It should not replace the dedicated common inputs above.

### 4.8 Optional payroll projection inputs

To support a more realistic projected monthly take-home figure, the app should optionally accept:

- PAYE tax code;
- tax-code basis, including cumulative versus Month 1 / Week 1 where applicable;
- pay frequency, defaulting to monthly;
- year-to-date taxable pay, where available;
- year-to-date Income Tax paid, where available.

These fields are not required for the annual ANI optimisation.

If they are omitted, the app should still provide an **estimated average monthly take-home** by annualising the tax model and dividing the relevant annual result across the configured pay frequency.

If they are provided, the app may additionally provide a **projected monthly / next-payslip take-home** based on PAYE assumptions.

The UI should clearly label which level of estimate is being shown.

---

## 5. ANI-Reducing Inputs

### 5.1 Salary sacrifice

Salary sacrificed before employment income is received reduces employment income and therefore affects ANI as well as Income Tax and employee NI.

The model should distinguish:

- existing regular salary sacrifice;
- additional regular salary sacrifice being explored;
- bonus salary sacrifice.

### 5.2 Personal pension / SIPP contributions

Support relief-at-source personal pension contributions.

The user should enter the **net amount actually paid**.

For ANI calculations, the model should gross this amount up using the applicable basic rate. Under current HMRC guidance, £1 paid into a relief-at-source pension reduces ANI by £1.25.

The UI should show both:

- net contribution paid by the user; and
- gross contribution used for ANI/pension calculations.

### 5.3 Gift Aid

Support Gift Aid donations.

The user should enter the **cash amount donated**.

For ANI calculations, the model should gross the donation up using the applicable basic rate. Under current HMRC guidance, £1 donated through Gift Aid reduces ANI by £1.25.

The UI should show the grossed-up ANI adjustment.

---

## 6. Target ANI

The statutory childcare threshold and the user's planning target are separate concepts.

### 6.1 Eligibility threshold

For the initial 2026/27 configuration:

- childcare ANI threshold: £100,000.

The threshold must live in tax-year/configuration data rather than UI code.

### 6.2 User target

The user should be able to set a target below the statutory threshold, for example:

- £100,000;
- £99,500;
- £99,000; or
- any custom amount.

The difference between the statutory threshold and target represents a safety buffer.

The UI should explicitly show:

- statutory threshold;
- selected target;
- current headroom to target; and
- current headroom to statutory threshold.

---

## 7. Forecast vs Actual Values

Where income is uncertain, the app should allow an input to be marked as:

- forecast; or
- actual/known.

At minimum this should apply to:

- bonus;
- RSUs;
- taxable benefits; and
- savings interest.

The projection should identify how much headroom remains for forecast error.

Example insight:

> Your current plan leaves £1,400 of headroom to your target. Income above forecast by more than £1,400 would exceed that target.

MVP does not require probabilistic forecasting.

---

## 8. Scenario Model

The UI should expose three related scenarios.

### 8.1 Current

Represents the user's currently intended plan.

It should reflect:

- existing regular sacrifice;
- current bonus sacrifice election;
- SIPP contributions;
- Gift Aid; and
- all expected income.

### 8.2 Optimal

Computed by the application.

The default optimisation goal is:

> Find the minimum additional salary sacrifice required to bring projected ANI to or below the selected target.

The optimisation result should not imply that maximising pension contributions is inherently preferable. It answers the chosen target constraint.

Where the target cannot be reached within configured limits, the app should explain why.

### 8.3 Alternative

A sandbox scenario for manually exploring another allocation.

The user should be able to change salary sacrifice and other controllable inputs without changing Current.

This scenario is intended for "what if?" analysis.

### 8.4 Comparison

Current, Optimal, and Alternative should be comparable at a glance using at least:

- ANI;
- annual take-home income;
- estimated average monthly take-home;
- projected monthly / next-payslip take-home where payroll inputs are available;
- employee pension contribution;
- total pension input where known;
- Income Tax;
- employee NI;
- target headroom; and
- statutory-threshold headroom.

The main graph should identify the scenario positions.

---

## 9. Core Projection Model

At a conceptual level:

```ts
type Scenario = {
  // tax year, income, pension and planning inputs
};

type Projection = {
  adjustedNetIncome: number;
  taxableIncome: number;
  personalAllowance: number;
  incomeTax: number;
  employeeNationalInsurance: number;
  takeHomeIncome: number;
  estimatedAverageMonthlyTakeHome: number;
  projectedMonthlyTakeHome?: number;

  employeeSalarySacrifice: number;
  bonusSalarySacrifice: number;
  grossSippContribution: number;
  grossGiftAid: number;

  headroomToTarget: number;
  headroomToEligibilityThreshold: number;

  // additional derived values
};

function project(
  scenario: Scenario,
  additionalSalarySacrifice: number,
): Projection;
```

The graph is produced by sampling `project()` across a sensible salary-sacrifice range.

Tax logic must remain deterministic and side-effect free.

---

## 10. Calculation Responsibilities

The model should calculate at least:

### 10.1 Adjusted net income

An expandable trace should show how ANI was derived.

Conceptually:

```text
Base employment income
+ taxable bonus
+ taxable RSU/equity income
+ taxable benefits
+ savings interest
+ other taxable income
- salary sacrificed before receipt
----------------------------------
Net/taxable income before ANI adjustments
- grossed-up eligible SIPP contribution
- grossed-up Gift Aid
----------------------------------
Adjusted net income
```

The implementation must follow HMRC definitions rather than assuming this simplified presentation is sufficient for every future input type.

### 10.2 Personal Allowance

For 2026/27, model:

- standard Personal Allowance;
- reduction where ANI exceeds £100,000;
- £1 reduction for each £2 of ANI above the limit;
- complete loss of Personal Allowance where applicable.

### 10.3 Income Tax

Calculate Income Tax for the supported jurisdiction and selected tax year.

Tax bands and rates belong in tax-year configuration.

### 10.4 Employee National Insurance

Calculate employee Class 1 National Insurance sufficiently accurately for annual planning.

If annualisation introduces differences from real payroll treatment, the UI/documentation should disclose that assumption.

### 10.5 Monthly take-home projection

The application should provide two related figures.

#### Average monthly estimate

Always available.

This is derived from the annual projection and is intended for planning rather than payslip reconciliation.

It should show the average monthly effect of the selected scenario on take-home pay.

#### PAYE-aware monthly projection

Optional.

When sufficient payroll inputs are supplied, the app should estimate monthly / next-payslip take-home using:

- gross monthly pay;
- regular salary sacrifice;
- PAYE tax code;
- cumulative or Month 1 / Week 1 basis;
- year-to-date taxable pay and tax paid where relevant;
- employee National Insurance;
- bonus or other one-off employment income when applicable.

The implementation should clearly document any simplifications relative to HMRC payroll calculations.

Where year-to-date inputs are unavailable, the app should avoid implying that a PAYE-aware result is exact.

The monthly projection should show at least:

- gross pay;
- pension salary sacrifice;
- taxable pay;
- estimated Income Tax;
- estimated employee NI;
- estimated net pay.

### 10.6 Pension totals

Calculate separately:

- regular employee salary sacrifice;
- bonus sacrifice;
- gross SIPP contribution;
- employer pension contribution, if supplied;
- total pension input used for allowance monitoring.

### 10.7 Pension annual allowance warning

The 2026/27 standard pension annual allowance is £60,000.

MVP should:

- allow employer contributions to be entered;
- calculate total modelled pension input;
- flag when the standard annual allowance is approached or exceeded.

Full modelling of tapered annual allowance, carry-forward, defined-benefit pension input amounts, or Money Purchase Annual Allowance is not required for MVP.

Warnings must make this limitation clear.

---

## 11. Visualisation

The visualisation is the central application feature.

### 11.1 Primary axis

X-axis:

> Additional regular salary sacrifice

The range should include:

- zero additional sacrifice;
- the computed optimal amount;
- enough space beyond the target to show the shape of the trade-off.

A sensible range may be derived from income and pension constraints rather than hard-coded.

### 11.2 Displayed outcomes

The graph should make it possible to understand at least:

- take-home income;
- pension contribution / pension value;
- ANI.

Whether these are best represented on one chart or as coordinated charts should be decided during implementation based on readability.

Avoid misleading dual-axis representations.

### 11.3 Important markers

Show markers for:

- Current;
- Optimal;
- Alternative;
- selected ANI target;
- statutory £100,000 ANI threshold;
- relevant Personal Allowance breakpoints.

### 11.4 Interaction

The user should be able to:

- move or select the Alternative sacrifice amount;
- inspect points on the curve;
- see calculated values for the selected point;
- reset Alternative to Current or Optimal.

Dragging may be supported, but all interaction must also be possible via accessible form controls.

---

## 12. Derived Insights

The model should return structured facts from which the UI can render contextual insights.

Examples:

- "Projected ANI is £8,700 above your target."
- "An additional £8,700 of qualifying sacrifice would reach the target."
- "Sacrificing your full expected bonus reduces projected ANI by £12,000."
- "Full bonus sacrifice alone is not sufficient; another £4,600 is required."
- "Your plan leaves £750 of headroom for income above forecast."
- "This contribution restores £X of Personal Allowance."
- "Adding £1,000 to pension reduces estimated take-home by £Y over this interval."
- "The selected plan is within £250 of the statutory childcare threshold."
- "Projected pension input is within £X of the standard annual allowance."
- "This scenario reduces estimated average monthly take-home by £X."
- "With the supplied PAYE inputs, projected monthly take-home is £X."

Insights should be derived from structured calculation outputs, not from duplicating financial logic in presentation components.

---

## 13. Tooltips and Help

Helpful explanations are an MVP requirement.

Tooltips/help text should cover at least:

- Adjusted net income;
- why the £100,000 threshold matters;
- target ANI versus statutory threshold;
- salary sacrifice;
- bonus sacrifice;
- SIPP contributions and grossing up;
- Gift Aid and grossing up;
- taxable benefits;
- savings interest;
- RSU income;
- Personal Allowance taper;
- pension annual allowance;
- forecast versus actual values;
- estimated average monthly take-home versus PAYE-aware projection;
- PAYE tax codes;
- cumulative versus Month 1 / Week 1 tax-code basis.

Tooltips should be concise, with links to authoritative GOV.UK/HMRC guidance where useful.

---

## 14. Persistence

### 14.1 Local persistence

Application state should be stored locally in the browser so the user can return to the current plan.

`localStorage` is sufficient for MVP unless implementation experience exposes a reason to use IndexedDB.

No backend persistence is required.

UI preferences such as theme selection should also be persisted locally.

### 14.2 JSON export/import

The entire planning state must be exportable to JSON and importable later.

The format must be explicitly versioned.

Example:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-09-16T22:00:00Z",
  "taxYear": "2026/27",
  "plan": {}
}
```

The export should contain enough information to reproduce the user's inputs and scenarios.

It should not need to contain calculated values that can be recomputed.

Import should:

- validate the schema;
- reject invalid or unsupported data safely;
- provide useful error messages;
- support future migration between schema versions where practical.

### 14.3 Tax configuration reproducibility

A saved plan should identify the tax-year configuration against which it was created.

If calculation rules change after export, the app should be able to warn that the imported plan will be recalculated under a different configuration/version.

---

## 15. Human-Readable Export and Printing

The application should provide a print-friendly summary suitable for:

- browser printing;
- Save as PDF; and
- reviewing the plan without using the interactive application.

The report should include:

- tax year;
- statutory threshold;
- selected ANI target;
- all relevant inputs;
- forecast/actual labels;
- Current / Optimal / Alternative comparison;
- key derived insights;
- ANI calculation trace;
- pension totals;
- assumptions and warnings;
- a print-suitable graph or graph snapshot if practical.

Dedicated server-side PDF generation is out of scope.

A simple human-readable text/Markdown export may be considered if it falls out naturally from the same report model, but is not required if the print view is sufficient.

---

## 16. Calculation Trace

Important results should be explainable.

The user should be able to expand a result and see the components contributing to it.

At minimum:

### 16.1 ANI trace

Show taxable income components and ANI deductions.

### 16.2 Income Tax trace

Show:

- Personal Allowance;
- taxable amount by band;
- rate applied;
- tax per band;
- total tax.

### 16.3 National Insurance trace

Show the thresholds/rates used and resulting employee NI.

### 16.4 Pension trace

Show:

- regular salary sacrifice;
- bonus sacrifice;
- SIPP net contribution;
- SIPP gross contribution;
- employer contribution;
- total relevant pension input.

This trace is both a user feature and a debugging aid.

---

## 17. Validation and Warnings

Inputs should be validated before calculation.

Examples:

- negative income should normally be rejected unless explicitly supported;
- sacrifice cannot exceed the compensation from which it is taken;
- bonus sacrifice cannot exceed bonus;
- percentages must remain within valid bounds;
- selected target should be positive;
- imported data must match a supported schema.

Warnings should be shown for:

- ANI above the statutory childcare threshold;
- very small headroom;
- pension input approaching/exceeding the standard annual allowance;
- unsupported pension allowance circumstances;
- forecast values that materially affect the result;
- inputs outside the assumptions of the model.

The application should distinguish errors from informational warnings.

---

## 18. Suggested Technical Architecture

### 18.1 Frontend

Recommended stack:

- React;
- TypeScript;
- Vite.

No backend is required for MVP.

### 18.2 Major modules

A possible structure:

```text
src/
  domain/
    scenario.ts
    projection.ts
    insights.ts

  tax/
    config/
      2026-27.ts
    ani.ts
    income-tax.ts
    national-insurance.ts
    pension.ts

  optimisation/
    target.ts
    sampling.ts

  persistence/
    schema.ts
    local-storage.ts
    import-export.ts

  components/
    inputs/
    chart/
    scenarios/
    traces/
    report/

  app/
```

The exact directory structure is not prescriptive; the architectural boundaries are.

### 18.3 Tax-year configuration

Tax-year-specific values should be data wherever practical.

Conceptually:

```ts
type TaxYearConfig = {
  id: "2026/27";

  personalAllowance: number;
  personalAllowanceTaperThreshold: number;

  incomeTaxBands: readonly TaxBand[];
  nationalInsurance: NationalInsuranceConfig;

  childcareAniThreshold: number;

  pension: {
    annualAllowance: number;
    basicRateRelief: number;
  };
};
```

The application should not scatter numeric tax thresholds through components or calculation functions.

### 18.4 State management

Start with ordinary React state/context.

A dedicated state-management dependency should only be introduced if implementation complexity justifies it.

---

## 19. Testing Strategy

Financial calculations require strong automated tests.

### 19.1 Unit tests

Pure calculation functions should have tests covering:

- below/at/above Income Tax thresholds;
- Personal Allowance taper boundaries;
- zero Personal Allowance;
- ANI at £100,000;
- ANI immediately above £100,000;
- salary-sacrifice effects;
- full and partial bonus sacrifice;
- SIPP gross-up;
- Gift Aid gross-up;
- savings interest;
- taxable benefits;
- RSU income;
- NI thresholds;
- pension annual allowance warnings.

Boundary-value tests are especially important.

### 19.2 Reference examples

Where HMRC/GOV.UK publishes worked examples, add corresponding regression tests where they map cleanly to supported functionality.

### 19.3 Optimisation tests

Verify that Optimal:

- reaches the configured target where possible;
- uses the minimum additional sacrifice within the model's resolution;
- correctly reports when the target cannot be reached;
- behaves correctly when Current is already below target.

### 19.4 Persistence tests

Test:

- JSON round-trip;
- schema validation;
- unsupported schema versions;
- migrations once a second version exists.

### 19.5 Type checking

Vite transpilation is not a substitute for TypeScript checking.

CI/build should run at least:

```text
tsc --noEmit
tests
production build
```

---

## 20. Privacy and Security

MVP should:

- make no network request containing financial inputs;
- require no authentication;
- use no analytics or telemetry;
- store plan data only locally unless the user explicitly exports it.

JSON exports contain sensitive financial data. The export UI should make that clear.

If links to GOV.UK guidance are included, they should be normal navigation links and should not include plan data.

---

## 21. Appearance and Theme

The application should support:

- System;
- Light;
- Dark.

Default to **System**.

The user's explicit choice should be persisted locally.

Implementation requirements:

- use semantic theme/design tokens rather than hard-coded component colours;
- ensure charts remain legible in both light and dark modes;
- warning/error/success states must not rely on colour alone;
- tooltips, focus states, and selected chart points must retain sufficient contrast;
- the print/report view should use a print-friendly light treatment regardless of the interactive UI theme.

Theme support is an MVP requirement.

## 22. Accessibility

The application should be usable without pointer-only interaction.

Requirements:

- all inputs have labels;
- tooltips/help are keyboard accessible;
- graph-selected values have an equivalent textual representation;
- Alternative can be controlled through numeric/form controls even if draggable interaction exists;
- sufficient contrast;
- sensible focus order;
- print view remains readable without colour.

---

## 23. Non-Goals for MVP

The following are deliberately out of scope unless implementation reveals a strong need:

- backend services;
- user accounts;
- cloud sync;
- public hosted service requirements;
- partner/household optimisation;
- nursery fee calculation;
- monetary valuation of free-childcare hours;
- Tax-Free Childcare top-up modelling;
- Scottish Income Tax;
- self-employment;
- property tax calculations;
- foreign tax/income complexity;
- student loans;
- multiple PAYE employments;
- exact payroll-engine / payslip reconciliation across every payroll edge case;
- employer NI savings/sharing;
- tapered pension annual allowance;
- pension carry-forward;
- Money Purchase Annual Allowance;
- defined-benefit pension input calculations;
- probabilistic RSU/bonus forecasting;
- automated market-price lookup for RSUs;
- server-generated PDF files.

These may be reconsidered later.

---

## 24. Potential Post-MVP Features

Possible extensions include:

- multiple tax years;
- Scottish tax support;
- detailed RSU vest events;
- income events through the tax year;
- remaining-month salary-sacrifice planning;
- scenario duplication and named scenarios;
- sensitivity ranges for bonus/RSU values;
- uncertainty bands on the chart;
- pension carry-forward;
- tapered annual allowance;
- employer NI contribution sharing;
- childcare-value modelling;
- Tax-Free Childcare modelling;
- partner income / household view;
- Markdown/text report export;
- shareable URL state with explicit privacy safeguards.

---

## 25. Initial UX Shape

A likely single-page layout:

### Inputs

Grouped into:

1. Employment income
2. Other taxable income
3. Pension / ANI adjustments
4. Planning target

### Headline summary

Show:

- projected ANI;
- target;
- amount above/below target;
- recommended additional sacrifice;
- remaining uncertainty headroom;
- estimated average monthly take-home;
- projected monthly / next-payslip take-home when payroll inputs are available.

### Main chart

Interactive sacrifice curve with Current, Optimal, and Alternative marked.

### Scenario comparison

Compact comparison of the three scenario outputs.

### Insights

Context-sensitive facts and warnings derived from the inputs.

### Calculation details

Expandable ANI, tax, NI, and pension traces.

### Save / export

- local save automatically;
- Import JSON;
- Export JSON;
- Print / Save as PDF.

### Appearance

Provide a compact theme control for:

- System;
- Light;
- Dark.

The exact layout should be refined during implementation rather than treated as a fixed wireframe.

---

## 26. Authoritative Sources and Current Assumptions

The tax model should prefer authoritative HMRC/GOV.UK sources.

Current references used when defining the initial model:

- Free Childcare for Working Parents:
  https://www.gov.uk/free-childcare-if-working
- Tax-Free Childcare eligibility:
  https://www.gov.uk/tax-free-childcare/check-if-youre-eligible
- HMRC adjusted net income guidance:
  https://www.gov.uk/guidance/adjusted-net-income
- HMRC Tax-Free Childcare ANI technical guidance:
  https://www.gov.uk/hmrc-internal-manuals/tax-free-childcare-technical-manual/tfc11050
- PAYE tax codes:
  https://www.gov.uk/tax-codes
- Income Tax rates and allowances:
  https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
- Pension scheme rates and annual allowance:
  https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates

For the initial 2026/27 model, current GOV.UK guidance establishes:

- expected ANI over £100,000 can make an individual ineligible for relevant childcare support;
- standard Personal Allowance is £12,570;
- Personal Allowance begins tapering above £100,000 ANI at £1 lost per £2 above the limit;
- Gift Aid and relief-at-source personal pension contributions are deducted from ANI on a grossed-up basis;
- the standard pension annual allowance is £60,000.

These values are policy/configuration, not architectural constants, and should be independently rechecked when implementing or adding a tax year.

---

## 27. MVP Success Criteria

The MVP is successful if the user can:

1. enter a realistic forecast of their annual taxable income;
2. explicitly account for bonus, RSUs, taxable benefits, savings interest, SIPP contributions, and Gift Aid;
3. represent their existing salary- and bonus-sacrifice choices;
4. choose an ANI target below or at the statutory threshold;
5. immediately see projected ANI and the amount of additional sacrifice required;
6. inspect a curve showing the financial effect of changing salary sacrifice;
7. compare Current, Optimal, and Alternative plans;
8. understand why each result was produced through traces, tooltips, and contextual insights;
9. receive useful warnings about insufficient headroom and pension allowance limits;
10. see an estimated average monthly take-home for each scenario;
11. optionally provide PAYE inputs and receive a more realistic monthly / next-payslip take-home projection;
12. switch between System, Light, and Dark appearance modes;
13. close and reopen the application without losing the plan or UI preferences;
14. export and later restore the plan as versioned JSON; and
15. produce a clear print/PDF-friendly human-readable summary.

The MVP should accomplish this entirely in the browser without requiring a backend.
