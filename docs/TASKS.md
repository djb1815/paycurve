# TASKS.md — Multi-Agent Implementation Plan

This is the authoritative implementation dependency graph for the UK Adjusted Net Income Planner. `docs/DESIGN.md` defines product behaviour; this document defines how that behaviour is divided, integrated, and verified. If a task needs a contract or responsibility not described here, use the contract-change process rather than silently expanding its scope.

## 1. Coordination model

### Worktrees and branches

- Keep the primary checkout at `/Volumes/Projects/paycurve/main` for integration.
- Create sibling worktrees at `/Volumes/Projects/paycurve/<task-id>-<short-name>`; never place one inside `main`.
- Name branches `task/<task-id>-<short-name>`, for example `task/t02-tax-engine`.
- Branch each task from the exact integration commit named in its assignment.
- One agent owns one task branch at a time. A handoff must record status, validation, commits, and unresolved issues.

```sh
git worktree add ../t02-tax-engine -b task/t02-tax-engine <integration-commit>
```

### Shared files and ownership

The integration owner exclusively edits package manifests and lockfiles; TypeScript, Vite, lint, formatting, test, `mise`, and CI configuration; `src/app/` and the application entrypoint; shared design tokens and public barrels; and task status in this document.

Task agents must:

- edit only owned paths and colocated tests; all other task paths are prohibited unless explicitly assigned;
- request dependencies from the integration owner, including the use case and why existing dependencies are insufficient;
- consume published contracts rather than another module's internals;
- avoid changing another task's fixtures to make local tests pass; and
- keep commits focused so they can be integrated without unrelated changes.

UI workstreams consume fixture-backed view models through props and never import tax, optimisation, or persistence implementations. Pure calculation layers never import React, browser APIs, application state, persistence, or feature modules.

### Contract freeze and changes

F00 freezes public types, pure-function signatures, fixture shapes, import boundaries, and the initial tax-config interface. Downstream tasks implement those contracts but do not casually reshape them.

If a frozen contract must change:

1. Stop dependent work and describe the concrete incompatibility in the handoff.
2. Propose the smallest change, naming affected tasks, migration impact, and fixture/test updates.
3. The integration owner creates or approves one dedicated `contract:` commit on the integration branch.
4. Every affected worktree incorporates that exact commit before continuing.
5. Update contract tests and fixtures first, then implementations; do not maintain divergent temporary interfaces.

Breaking persistence changes require a schema-version increment and migration. Stable issue, trace, and insight codes cannot be renamed without an explicit compatibility decision. Calculated values must not be persisted merely to avoid recomputation.

### Task definition and completion

Every assignment and handoff states its objective and non-goals, prerequisites and exact base commit, owned and prohibited paths, contracts consumed/exported, deliverables, behavioural acceptance criteria, validation commands/results, commits to integrate, and known limitations.

A task is complete only when its acceptance criteria pass, relevant documentation matches stable behaviour, and its handoff is usable without chat history. Only the integration owner changes task status here.

## 2. Dependency graph and merge order

```text
F00 Scaffold and frozen contracts
 ├─ T02 Tax primitives and verified 2026/27 configuration
 │    └─ T03 Annual projection, validation, totals, and traces
 │         └─ T04 Optimisation, curve sampling, and insights
 ├─ T05 PAYE-aware projection ───────────────┐
 ├─ T06 Persistence/import/export ───────────┤
 ├─ T08 Input UI using fixtures ─────────────┤
 ├─ T09 Chart and scenario UI using fixtures ┤
 ├─ T10 Summary and trace UI using fixtures ─┤
 └─ T11 Report, help, and settings UI ───────┤
      T03 + T04 + T05 + T06 ── T07 Planner state/orchestration
      T07–T11 ──────────────── T12 Application integration
      T12 ──────────────────── T13 Accessibility/E2E/final verification
```

Normal merge order is F00, T02, T03, T04/T05/T06, T07, T08–T11, T12, then T13. T05, T06, and T08–T11 may start from F00 and proceed in parallel. T04 starts after T03. T07 starts only after T03–T06 are integrated. Fixture-driven UI branches refresh from integration immediately before T12 rather than coupling to calculation branches during development.

## 3. Tasks

### F00 — Scaffold and frozen contracts

**Objective:** Establish a runnable React/TypeScript/Vite shell, strict tooling, architectural boundaries, domain contracts, versioned tax-config shape, and fixture-backed feature placeholders.

**Owns:** repository tooling/configuration, `src/app/`, `src/domain/`, shared fixture contracts, global tokens, and initial public barrels.

**Exports:** money/rate aliases, planner facts and allocations, projection/result/trace/issue types, tax-config types, optimiser results, persistence envelope types, feature props, and fixtures.

**Deliverables:** runnable shell, frozen contract modules, representative fixtures, architecture tests, shared theme tokens, and baseline CI/tooling.

**Non-goals:** financial calculations, production persistence, final UI behaviour, or polished content.

**Acceptance:** the shell renders every feature region; fixtures satisfy feature props; domain code has no React/browser dependency; architectural restrictions catch layer violations; System/Light/Dark tokens exist; export-envelope examples type-check; production build passes.

**Validation:** `mise run setup`, then `mise run check`.

### T02 — Tax primitives and verified 2026/27 configuration

**Prerequisite:** F00.

**Objective:** Implement deterministic, browser-independent ANI primitives, Personal Allowance, Income Tax, employee Class 1 NI, relief-at-source gross-up, and pension totals against verified 2026/27 policy.

**Owns:** `src/tax/` and its tests, including `src/tax/config/`.

**Prohibited:** React/features, projection orchestration, optimisation, persistence, app state, and app composition.

**Consumes/exports:** consumes frozen domain/config types; exports `resolveTaxYear` and pure tax/pension primitives with structured calculation steps.

**Deliverables:** verified 2026/27 configuration, tax/pension primitive modules, boundary/reference tests, and source-evidence notes.

**Acceptance:** tests cover exact boundaries and one penny either side; ANI includes every supported input and deduction; savings interest remains relevant to ANI; NI/tax bands come only from config; SIPP/Gift Aid gross-up and pension-warning inputs are explicit; no financial policy value is hidden in UI or orchestration code.

**Evidence:** record authoritative GOV.UK/HMRC URLs, page titles, retrieval date, and supported values. If a 2026/27 value is not officially confirmed, fail explicitly or mark configuration provisional; never silently copy a prior year.

**Validation/handoff:** targeted tax tests and full `mise run check`; provide source notes, public exports, rounding rules, and reference cases.

### T03 — Annual projection, validation, totals, and traces

**Prerequisite:** T02.

**Objective:** Compose tax primitives into the annual source-of-truth projection for Current, Alternative, and arbitrary allocations.

**Owns:** `src/projection/` and its tests.

**Prohibited:** tax policy duplication, optimiser search, React, browser persistence, and PAYE projection.

**Consumes/exports:** consumes `PlanFacts`, `ScenarioAllocation`, `TaxYearConfig`, and T02 primitives; exports `validatePlan` and `project`.

**Deliverables:** annual projector, plan/allocation validation, projection traces and issues, reference fixtures, and unit/integration tests.

**Acceptance:** validation distinguishes errors and warnings; bonus sacrifice cannot exceed bonus; total regular sacrifice and the required user cap cannot exceed unsacrificed base salary; unsupported National Minimum Wage/employer restrictions produce a prominent coded warning; projections return ANI, taxable income, allowance, tax, NI, pension totals, target/statutory headroom, issues, and deterministic traces; annual net employment pay and disposable cash are separate, with matching average-period values; no ambiguous `takeHomeIncome` exists.

**Validation/handoff:** test zero values, forecast/actual inputs, target boundaries, salary/bonus limits, SIPP/Gift Aid cash treatment, pension warnings, and trace arithmetic; provide fixture replacements and the issue/trace code catalogue.

### T04 — Optimisation, curve sampling, and insights

**Prerequisite:** T03.

**Objective:** Find the minimum permitted regular sacrifice meeting the target, sample the trade-off curve, compare scenarios, and derive structured facts without presentation prose.

**Owns:** `src/optimisation/`, `src/insights/`, and their tests.

**Prohibited:** tax formulas, UI copy/formatting, state mutation, persistence, and chart rendering.

**Consumes/exports:** consumes `project`; exports `optimiseToTarget`, `sampleSacrificeCurve`, `compareScenarios`, and `deriveInsights`.

**Deliverables:** target optimiser, curve sampler, scenario comparator, structured insight derivation, and behavioural/performance tests.

**Acceptance:** optimisation returns discriminated `alreadyAtOrBelow`, `reached`, or `unreachable`; search begins at Current and never exceeds the user-entered maximum additional regular sacrifice or salary constraints; `reached` is minimal at penny resolution; curve points include Current/Optimal/Alternative and relevant thresholds without misleading interpolation; insights use stable codes and numeric parameters and cover target distance, uncertainty headroom, bonus sufficiency, allowance restoration, marginal take-home cost, and pension allowance proximity.

**Validation/handoff:** test reachability, exact boundary, minimality, cap zero, invalid input, duplicate curve points, and deterministic ordering; provide performance characteristics and the insight-code catalogue.

### T05 — PAYE-aware projection

**Prerequisite:** F00; may consume integrated T02 config/types without coupling to T03.

**Objective:** Implement the full MVP PAYE-aware monthly/next-payslip projection when sufficient optional payroll inputs exist.

**Owns:** `src/payroll/` and its tests.

**Prohibited:** changing the annual projection source of truth, UI, state, persistence, or shared tax APIs without the contract process.

**Consumes/exports:** consumes payroll inputs, allocation, and tax config; exports a discriminated result for insufficient inputs, a supported projection, or invalid/unsupported cases.

**Deliverables:** PAYE projector, tax-code/basis handling, structured availability/assumption output, reference calculations, and tests.

**Acceptance:** supports configured pay frequency, tax-code interpretation, cumulative and Month 1/Week 1 bases, YTD taxable pay/tax where applicable, regular and one-off pay, salary sacrifice, Income Tax, and NI; output includes gross pay, sacrifice, taxable pay, tax, NI, and estimated net pay; assumptions and unavailable reasons are structured; it never claims payslip reconciliation or changes annual optimiser results.

**Validation/handoff:** test supported codes/bases, first/later periods, bonus periods, YTD reconciliation, missing/contradictory inputs, NI boundaries, and rounding; provide documented simplifications and reference calculations.

### T06 — Persistence, migration, and import/export

**Prerequisite:** F00.

**Objective:** Persist inputs/preferences locally and safely round-trip versioned JSON containing facts and user choices only.

**Owns:** `src/persistence/` and its tests.

**Prohibited:** calculated projections or Optimal in stored data, UI, tax logic, and app orchestration.

**Consumes/exports:** consumes planner/theme types; exports `encodeExport`, `decodeExport`, `migrateExport`, a storage adapter, and discriminated validation/recovery errors.

**Deliverables:** versioned schema, import/export codec, migration entrypoint, local-storage adapter, example payloads, and hostile-input tests.

**Acceptance:** the envelope includes `schemaVersion`, `exportedAt`, `taxYear`, and `taxConfigVersion`; Current/Alternative persist but Optimal, warnings, insights, traces, and samples do not; decode never throws for user input; unsupported versions/config mismatches differ; corrupt local data can be recovered without pre-emptive overwrite; storage remains local.

**Validation/handoff:** test round-trip, malformed JSON/value, unsupported versions, migration fixtures, storage failure, and config mismatch; provide example exports and migration policy.

### T07 — Planner state and orchestration

**Prerequisites:** T03, T04, T05, and T06 integrated.

**Objective:** Provide one React state boundary owning input edits, recomputation, scenario selection, persistence, imports, and theme preference.

**Owns:** `src/state/` and its tests.

**Prohibited:** feature rendering, tax formulas, persistence schema changes, app composition, and global styling.

**Consumes/exports:** consumes projection/optimisation/payroll/persistence APIs; exports context/hooks and selectors matching frozen feature props.

**Deliverables:** reducer/context, orchestration effects, selectors/view models, import and persistence flows, and state tests.

**Acceptance:** initial sacrifice cap is zero; all derived data is recomputed, not stored; Current/Alternative edits remain isolated; Optimal follows inputs and has no edit path; invalid edits expose issues without corrupting the last valid view; imports validate/migrate before replacement; storage failures are visible and non-fatal; theme defaults to System and explicit choices persist.

**Validation/handoff:** reducer/selector tests cover every action, stale results, import replacement, storage failure, scenario reset, and PAYE availability; provide provider setup and fixture-to-live mapping.

### T08 — Input UI using fixtures

**Prerequisite:** F00.

**Objective:** Build accessible controlled forms for income, allocations, payroll details, and target using fixture callbacks.

**Owns:** `src/features/inputs/` and colocated tests/styles.

**Prohibited:** calculation imports, persistence, global tokens, state implementation, and app composition.

**Consumes/exports:** consumes input feature props; exports the input feature component.

**Deliverables:** controlled input sections, field help/validation presentation, payroll disclosure UI, styles, and interaction tests.

**Acceptance:** every field has a label, help, and units; forecast/actual exists where designed; guide bonus/override and full-bonus sacrifice are representable; maximum additional regular sacrifice is required and its limitation warning prominent; optional payroll fields reveal dependencies; keyboard use and validation summaries work; boundary values remain integer-penny-safe.

**Validation/handoff:** interaction tests cover entry, status toggles, validation association, payroll disclosure, and callback payloads; provide screenshots/states and accessibility notes.

### T09 — Chart and scenario UI using fixtures

**Prerequisite:** F00.

**Objective:** Render the sacrifice curve and Current/Optimal/Alternative comparison with equivalent accessible controls.

**Owns:** `src/features/chart/`, `src/features/scenarios/`, and colocated tests/styles.

**Prohibited:** tax/optimisation calls, app state, global styles, and chart-derived financial calculations.

**Consumes/exports:** consumes sampled points, markers, formatted scenario view models, and callbacks; exports chart/scenario components.

**Deliverables:** responsive chart, scenario comparison, accessible Alternative controls/text equivalent, styles, and component tests.

**Acceptance:** avoids misleading dual axes; distinguishes ANI, net employment pay, disposable cash, and pension value; includes target/statutory/breakpoint markers; Alternative can be selected/reset by keyboard/form controls without dragging; every selected point has equivalent text/table content; empty, invalid, and unreachable states are useful; charts remain legible in all themes and print.

**Validation/handoff:** test markers, keyboard selection, resets, textual alternative, responsive/empty states, and status labels; document chart-library accessibility limitations.

### T10 — Summary and calculation trace UI using fixtures

**Prerequisite:** F00.

**Objective:** Present headline outcomes, issues, insights, scenario deltas, and expandable ANI/tax/NI/pension traces.

**Owns:** `src/features/summary/`, `src/features/traces/`, and colocated tests/styles.

**Prohibited:** recalculation from trace rows, financial logic, state, app composition, and global tokens.

**Consumes/exports:** consumes structured view models; exports summary/trace components and UI-owned prose/formatting mappings.

**Deliverables:** headline summary, issue/insight presentation, expandable traces, copy mappings, styles, and component tests.

**Acceptance:** net employment pay and disposable cash are never conflated; forecast/actual and average-period/PAYE-aware values are labelled; severity is conveyed without colour alone; stable codes map to concise prose; traces reconcile visually to supplied totals and work by keyboard; unknown codes have safe fallback presentation.

**Validation/handoff:** test formatting, negative/headroom states, unknown codes, expand/collapse, issue order, and cash labels; provide copy/code maps.

### T11 — Report, help, and settings UI using fixtures

**Prerequisite:** F00.

**Objective:** Provide print-friendly reporting, contextual help, import/export/settings controls, and complete theme controls.

**Owns:** `src/features/report/`, `src/features/settings/`, assigned shared help content, and colocated tests/styles.

**Prohibited:** persistence internals, app state, tax logic, global-token edits, and app composition.

**Consumes/exports:** consumes report/settings/help view models and callbacks; exports report/settings components.

**Deliverables:** printable report, help content, import/export and theme controls, print styles, and component tests.

**Acceptance:** report includes tax year/config version, inputs/forecast labels, scenario comparison, warnings/assumptions, traces, and printable chart alternative; print is light and readable; export warns that data is sensitive; import errors are actionable; System/Light/Dark work by keyboard; required help topics and authoritative links contain no plan data.

**Validation/handoff:** component and print-style tests cover controls, failures, theme selection, and report completeness; provide help sources and print limitations.

### T12 — Application integration

**Prerequisites:** T07 through T11 integrated; T02 through T06 are integrated transitively.

**Objective:** Replace fixtures with live view models, compose the single page, and resolve integration defects without crossing boundaries unnecessarily.

**Owns:** `src/app/`, entrypoint, integration tests, shared barrels/tokens, and integration configuration under the integration owner.

**Prohibited:** redesigning financial contracts or silently patching module internals; defects return to their owner unless a minimal integration fix is accepted.

**Deliverables:** live application composition, integration adapters, fixture removal, integration tests, and release-candidate handoff.

**Acceptance:** a user can enter a plan, compare scenarios, inspect chart/insights/traces, receive PAYE output when inputs suffice, save/reload, import/export, switch theme, and print; derived data updates coherently; no financial input is transmitted; no fixture-only production path remains.

**Validation/handoff:** full `mise run check`, production-preview smoke test, browser console/network inspection, and persistence round-trip; provide integration decisions and a release-candidate commit.

### T13 — Accessibility, end-to-end, and final verification

**Prerequisite:** T12 release candidate.

**Objective:** Verify the complete MVP, route release-blocking defects to owners, and produce auditable release evidence.

**Owns:** end-to-end/accessibility tests and final verification notes; production fixes remain with their owning module or integration owner.

**Prohibited:** scope expansion, new architecture, unverified policy changes, or suppressing failures to obtain green checks.

**Deliverables:** end-to-end/accessibility suite, manual release checklist, defect evidence, and final verification report.

**Acceptance:** E2E covers baseline, target reached, already below, unreachable, forecast headroom, bonus/SIPP/Gift Aid, PAYE sufficient/insufficient, persistence/import failures, all themes, and print; keyboard-only core flows pass; focus, labels, contrast, non-colour status, textual chart alternative, and responsive layout pass; reference/statutory boundaries pass; a clean checkout installs/builds reproducibly.

**Validation/handoff:** run `mise run setup`, `mise run check`, project E2E/accessibility commands, and the manual release checklist. Record environment, exact commands, results, limitations, and release commit.

## 4. Integration and handoff rules

Before integration, each agent must:

1. incorporate the latest applicable contract commit;
2. run targeted tests and the full check suite;
3. inspect `git diff` for out-of-scope/generated changes;
4. provide commit hashes in dependency order;
5. list changed exports, stable codes, fixtures, and assumptions; and
6. state failures and tests not run truthfully.

The integration owner must:

1. merge prerequisites before dependants and fixture UI before live-state wiring;
2. resolve shared-file conflicts centrally while preserving task-owned behaviour;
3. rerun `mise run check` after every contract or wiring merge group;
4. return behavioural regressions to the owning task rather than accumulating them in `src/app/`; and
5. mark a task complete only after its integrated criteria pass.

Compilation alone never completes a task. Financial work needs boundary/reference tests, UI work needs behaviour/accessibility tests, persistence needs hostile-input tests, and integration needs a user-visible workflow check.
