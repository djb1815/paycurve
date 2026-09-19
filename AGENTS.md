# Agent Guide

## Project intent

- Build the browser-only UK Adjusted Net Income Planner defined in `docs/DESIGN.md`.
- Treat `docs/DESIGN.md` as the product source of truth and `docs/TASKS.md` as the implementation and ownership source of truth.
- Keep financial data local: no backend, accounts, telemetry, or transmission of plan inputs.
- Do not present fixture values or unsupported assumptions as calculated results.

## Before starting

- Read the assigned task in `docs/TASKS.md`, including its prerequisites, owned paths, prohibited paths, interfaces, and acceptance criteria.
- Confirm the worktree is based on the exact integration commit in the assignment.
- Inspect existing code and tests before changing an interface or adding a dependency.
- Stop and use the contract-change process in `docs/TASKS.md` when a frozen contract blocks correct implementation.

## Architecture boundaries

- Keep `src/domain/`, `src/tax/`, `src/projection/`, `src/optimisation/`, `src/payroll/`, and `src/insights/` deterministic and free of React and browser APIs.
- Keep tax policy in versioned tax-year configuration; never scatter thresholds or rates through UI or orchestration code.
- Represent money as integer pence and configured rates as integer basis points.
- Return structured issues, traces, and insights from calculation layers; presentation owns prose and formatting.
- Persist inputs and user choices only. Recompute Optimal, projections, samples, traces, warnings, and insights.
- UI features consume typed props/view models and do not import financial implementations directly.

## Implementation discipline

- Edit only the paths owned by the assigned task and keep tests colocated where practical.
- Preserve existing conventions and favour small pure functions over new abstractions.
- Add dependencies only through the integration owner; include the use case and why current dependencies are insufficient.
- Verify tax-year values against authoritative GOV.UK or HMRC sources before encoding them; record the source and retrieval date.
- Cover financial boundaries exactly and one penny either side where applicable.
- Update documentation only after behaviour and interfaces are stable.

## Tooling

- Use the pinned tools from `mise.toml`; do not install global packages.
- Run `mise run setup` after creating or refreshing a worktree.
- Use `mise run dev`, `mise run test`, and `mise run test-watch` during development.
- Run `mise run format` only on intended project changes.
- Run `mise run check` before handoff; report any check that could not be run.

## Git and worktrees

- Follow the sibling worktree and `task/<task-id>-<short-name>` conventions in `docs/TASKS.md`.
- Preserve uncommitted changes you did not create and avoid unrelated cleanup.
- Do not push, rebase, reset shared history, or change task status unless explicitly assigned.
- Keep shared manifests, lockfiles, tooling, app composition, global tokens, public barrels, and task status under integration-owner control.

## Recipe-style commits

- Make each commit a coherent, reviewable recipe for one completed outcome, not a chronological worklog.
- Start with a short imperative summary describing what the commit accomplishes.
- After a blank line, describe the included behaviour, interfaces, tests, and important constraints.
- Explain why a non-obvious decision belongs in the change; omit routine narration.
- Avoid subjects such as “work in progress”, “continue implementation”, “fix tests”, or “misc updates”.
- Keep formatting-only or contract-change commits separate when that separation helps downstream worktrees.

Example:

```text
Implement annual ANI projection

- Calculate allowance, Income Tax, NI, and pension totals from tax-year config.
- Return structured traces and validation issues for each scenario.
- Cover target, taper, sacrifice, and pension-allowance boundaries.
```

## Completion and handoff

- Meet every behavioural acceptance criterion in the assigned task, not only compilation.
- Review the final diff for scope, generated files, sensitive data, and accidental fixture changes.
- Provide commit hashes in dependency order, validation commands/results, changed exports or stable codes, assumptions, and unresolved issues.
- Leave the handoff usable without relying on chat history.
