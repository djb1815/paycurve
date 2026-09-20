# Agent Guide

## Purpose and scope

- Paycurve is a browser-only UK Adjusted Net Income planner for one PAYE employment.
- The MVP supports 2026/27 and the main Income Tax treatment for England, Wales, and Northern Ireland; Scottish Income Tax is out of scope.
- Keep financial data local. Do not add a backend, accounts, telemetry, or input transmission without an explicit product decision.
- Treat `docs/DESIGN.md` as the product specification, `docs/VERIFICATION.md` as the release checklist, and `src/tax/SOURCES.md` as the tax-policy evidence record.
- Do not present fixture data, stale results, or unsupported assumptions as current calculations.

## Architecture

- `src/domain/` owns stable, framework-independent contracts.
- `src/tax/`, `src/projection/`, `src/optimisation/`, `src/payroll/`, and `src/insights/` contain deterministic logic and must stay free of React and browser APIs.
- `src/persistence/` validates versioned imports and stores inputs and user choices only.
- `src/state/` is the single React state/orchestration boundary; invalid drafts retain the last valid derived result.
- `src/app/` maps state and domain values to presentation view models and composes the page.
- `src/features/` renders typed props and must not import or reimplement financial calculations.
- Fixtures are for isolated examples and tests; production composition uses live state.

## Financial rules

- Represent money as integer pence and configured rates as integer basis points; do not calculate with floating-point pounds.
- Keep all thresholds and rates in versioned tax-year configuration, never in UI or orchestration code.
- Keep annual ANI optimisation separate from optional PAYE-period estimation.
- Distinguish net employment pay from disposable cash, and annual averages from PAYE-aware estimates.
- Return structured issues, traces, assumptions, and insights from calculation layers; presentation owns prose and formatting.
- Persist no derived projections, Optimal result, traces, curve samples, warnings, or insights. Optimal is derived and immutable; Current and Alternative are editable.
- Surface modelling limitations instead of implying unsupported precision.

## Change discipline

- Inspect the relevant implementation, contracts, and tests before editing; preserve APIs and persisted schemas unless a breaking change is required.
- Keep changes focused and favour small pure functions over unnecessary abstractions.
- Add dependencies only when existing tools cannot reasonably solve the need, and keep manifests and lockfiles consistent.
- Verify tax-policy changes against authoritative GOV.UK or HMRC sources and update `src/tax/SOURCES.md` with the source, retrieval date, value, and provisional status where applicable.
- Increment the persistence schema and add migrations for breaking stored-data changes.
- Preserve stable issue, trace, insight, and assumption codes unless a compatibility change is intentional.
- Add meaningful tests; cover financial thresholds exactly and one penny either side where relevant, and ensure hostile imports never throw.
- UI changes must retain labels, help, keyboard operation, visible focus, non-colour status meaning, textual chart alternatives, theme support, and print readability.

## Tooling and validation

- Use the Bun and Node.js versions pinned in `mise.toml`; do not install global project tooling.
- Run `mise run setup` after creating or refreshing a checkout.
- Use `mise run dev`, `mise run test`, and `mise run test-watch` while developing.
- Use `mise run format` only when every file it may rewrite is an intended change.
- Run `mise run build` for a production build and `mise run check` for the full format, lint, type-check, test, and build gate.
- Record manual browser, print, contrast, and accessibility evidence or limitations in `docs/VERIFICATION.md`.

## Git and commits

- Preserve uncommitted changes you did not create and avoid unrelated cleanup.
- Put additional worktrees beside the primary `main` checkout, never inside it; keep parallel work on disjoint paths.
- Centralise edits to shared manifests, tooling, public contracts, global styles, and app composition.
- Do not push, rebase, reset shared history, delete branches, or perform destructive or remote-affecting operations unless explicitly requested.
- Review diffs for generated files, financial data, secrets, accidental fixture use, and out-of-scope changes.
- Make each commit a coherent recipe for one completed outcome, not a chronological worklog.
- Start with a short imperative summary, then a blank line and a description of included behaviour, interfaces, tests, and important constraints.
- Explain non-obvious reasons and avoid subjects such as “work in progress”, “continue implementation”, “fix tests”, or “misc updates”.

## Completion

- Confirm the requested user-visible outcome, not only compilation.
- Run focused checks and the full gate when practical.
- Report significant changes, exact validation performed, and unresolved limitations.
- Leave the working tree and handoff understandable without relying on chat history.
