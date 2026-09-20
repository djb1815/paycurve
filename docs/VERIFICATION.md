# MVP verification record

## Scope and environment

- Product: browser-only UK Adjusted Net Income Planner for tax year 2026/27.
- Baseline integration commit: `0a726d9` (`Wire the live planner application`).
- Verification changes under review: T13 release hardening in the shared working tree.
- Date started: 2026-09-20.
- Runtime: Bun 1.4.2 and Node.js 24.21.0, pinned by `mise.toml`.
- Test environment: Vitest 5.0.1 with jsdom and Testing Library; CSS modules are enabled.

## Automated verification

### T13 release-flow suite

Command run:

```sh
mise run test -- src/app/ReleaseVerification.test.tsx
```

Result: passed — 1 file, 5 tests, on 2026-09-20.

`src/app/ReleaseVerification.test.tsx` verifies the user-visible integration
paths without duplicating financial unit calculations:

| T13 area                                     | Automated evidence                                                                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline and reached target                  | Live planner renders a target-reaching optimisation with Current, Optimal, and Alternative results.                                                              |
| Already below and unreachable target         | Separate plans expose textual “already meets” and “cannot be reached” states, including the Optimal limit label.                                                 |
| Forecast headroom, bonus, SIPP, and Gift Aid | A forecast bonus/equity plan with SIPP and Gift Aid shows forecast-headroom insight and separate disposable-cash inputs.                                         |
| PAYE                                         | No-payroll, supported 1257L monthly, and unsupported S1257L states are distinguished; the supported path has a labelled breakdown and reconciliation limitation. |
| Persistence and import                       | A write failure leaves the plan usable; malformed JSON is rejected without replacement; a valid versioned export replaces the plan.                              |
| Themes and print                             | System, Light, and Dark selections update the document theme; the print action is invoked and the report includes its text/table alternative.                    |
| Keyboard, labels, and non-colour status      | Native keyboard scenario selection and PAYE disclosure work; chart samples have a labelled select/table alternative; information has an explicit text label.     |
| Chart alternative                            | The exact-samples table and selected Alternative summary are available independently of the decorative plots.                                                    |

### Financial/reference regression suites

The release flow intentionally relies on focused pure-layer tests for statutory
arithmetic and penny boundaries:

```sh
mise run test -- src/tax/tax.test.ts src/projection/project.test.ts src/payroll/project.test.ts src/persistence/import-export.test.ts
```

Required coverage in those suites includes:

- Personal Allowance taper values around £100,000 and the zero-allowance end;
- one-penny salary-sacrifice, bonus-sacrifice, and pension-allowance limits;
- ANI treatment of bonus, equity, benefits, savings interest, SIPP, and Gift Aid;
- PAYE cumulative/Month 1 behaviour, period NI thresholds, YTD reconciliation,
  one-off pay, invalid input, and K-code 50% deduction cap;
- hostile/corrupt import, configuration mismatch, unsupported schema, and
  migration behaviour.

Result: passed — 4 files, 68 tests, on 2026-09-20.

### Final automated gate

Commands run after the T13 changes were integrated:

```sh
mise run setup
mise run check
```

Latest integrated run (2026-09-20): **passed**.

- `mise run setup`: Bun checked 276 installs across 301 packages with no
  changes.
- Prettier: passed.
- ESLint with zero warnings: passed.
- TypeScript project build: passed.
- Vitest: 23 files and 135 tests passed.
- Vite production build: passed; 87 modules transformed.
- Vite production preview: served the built entry point from
  `http://127.0.0.1:4173/`; an HTTP smoke check returned `200 OK` and referenced
  the generated JavaScript and CSS assets.

The automated release gate is green. Real-browser, accessibility-tool, and
manual checklist evidence remains pending and is not implied by this result.

## Manual release checklist

These checks require a real browser and are not represented as passed here.

- [ ] Start `mise run dev`; load a clean browser profile and confirm no plan
      input, export, or telemetry is sent over the network.
- [ ] Exercise baseline, target reached, already-below, unreachable, and
      forecast-headroom plans at desktop and narrow mobile widths.
- [ ] Enter a bonus, SIPP contribution, Gift Aid donation, and two distinct
      equity vest events; confirm each remains editable and survives export/import.
- [ ] Check supported cumulative and Month 1/Week 1 PAYE examples, missing
      payroll details, invalid tax code, YTD values, regular pay, and one-off pay.
- [ ] Complete the core input, disclosure, scenario, alternative/reset, theme,
      export/import, help, and print workflows using keyboard only.
- [ ] Inspect focus visibility, labels/help/units, validation announcement,
      live-status wording, and that warning/information meaning is available in
      text rather than colour alone.
- [ ] Inspect Light, Dark, and System themes for readable text, controls,
      charts, markers, and notices. Measure contrast with a browser tool where
      required by the release policy.
- [ ] Use print preview and a printed/PDF result: report inputs, scenario
      comparison, notices, assumptions, traces, and the sacrifice table must be
      readable without relying on the plots or interactive controls.
- [ ] Test import of corrupt JSON, unsupported schema/config, and a valid
      export in a browser where local storage is blocked or full; confirm recovery
      wording and that the open plan is retained.
- [ ] Run an accessibility browser audit (for example axe) and resolve any
      serious/critical findings; record the tool, browser, and findings below.

## Limitations and evidence boundaries

- The automated UI suite runs in jsdom, not a real layout/print engine. It
  cannot establish responsive layout, computed contrast, visual focus, native
  download behaviour, or print pagination.
- No browser-based axe audit or manual browser pass has been run or claimed in
  this record yet.
- The app is a planning estimate, not tax advice or payslip reconciliation;
  PAYE output is deliberately labelled as an estimate and depends on supplied
  payroll details.
- Financial policy verification remains in the tax configuration source notes
  and pure-layer reference tests; this document does not independently certify
  HMRC policy values.

## Release criteria

Release is permitted only when all conditions hold:

1. `mise run setup` and `mise run check` pass from the final release commit.
2. The T13 release-flow and financial/reference suites above pass on that
   commit.
3. Every manual checklist item is completed with any findings recorded and
   release-blocking issues resolved.
4. No critical accessibility audit finding, stale calculation state, import
   data-loss path, or unsupported financial claim remains open.
5. This record is updated with the final commit, commands, results, browser/
   accessibility evidence, known limitations, and release decision.
