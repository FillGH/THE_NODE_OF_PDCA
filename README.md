# Project Starter Development Kit

> **v0.3 — Practical Learning from Android Projects**

A lightweight, risk-based starter for engineering and software projects. It is designed to be reusable across web apps, dashboards, automations, AlgoTrade systems, industrial tools, scripts, and other technical projects without forcing heavyweight process onto small work.

## Core principle

**Use engineering judgment to add only the process, code, documentation, and controls that earn their cost.**

The kit standardizes the way a project is thought through, not the technology used to build it.

## Development lifecycle

```text
DEFINE → DESIGN → BUILD → VERIFY → OPERATE → LEARN
```

### DEFINE
Understand the problem, desired outcome, users, constraints, assumptions, and consequences of failure. A valid outcome may be **DO NOT BUILD** when a simpler solution is better.

### DESIGN
Choose scope, trade-offs, solution approach, risks, and acceptance criteria. Use a prototype, mock-up, pseudo-code, simulation, or other concrete preview when it helps resolve uncertainty before expensive implementation.

For **user-facing web apps or other UI-heavy products**, UI/UX refinement belongs in DESIGN by default when late interface changes would cause meaningful rework:

1. Build a lightweight working prototype or preview using representative mock data.
2. Walk through important flows and realistic states (for example, empty content, keyboard open, long content, and Back navigation when relevant).
3. Refine information hierarchy, layout, wording, actions, navigation, and responsive behavior on representative target devices/viewports.
4. Resolve material UI/UX decisions with the owner/user.
5. Record the accepted interaction/UI baseline in `PROJECT.md` or link to the accepted prototype.
6. Only then begin substantial backend, database, authentication, infrastructure, or deployment integration unless that integration is itself required to resolve a material design uncertainty.

The goal is **not pixel-perfect design before coding**. The goal is to avoid paying integration cost while the fundamental interaction model is still changing.

This is a context-specific design technique, not a mandatory phase for non-UI projects.

When persistent data matters, briefly decide who owns it, where it is stored, what delete/uninstall does, and whether backup/restore is needed. Do not require a data matrix for projects without meaningful data-loss risk.

### BUILD
Implement the agreed baseline using the simplest sufficient solution. Avoid speculative features, unnecessary abstractions, and infrastructure without a demonstrated need.

Build in reviewable increments when that reduces rework. For UI-heavy products, implement from the accepted interaction baseline and do not reopen fundamental UI/UX decisions without a concrete requirement, usability finding, or implementation constraint.

An early prototype is not production evidence. Final verification must cover the intended integrated behavior and target environment where those materially affect correctness.

### VERIFY
Use evidence to show that the solution satisfies the acceptance criteria. Evidence may include manual tests, automated tests, backtests, field tests, smoke tests, or user acceptance depending on the project.

A successful build/CI run is not proof of correct behavior on the target device or environment. Report material checks honestly as **PASS / FAIL / NOT TESTED (including owner-deferred) / OUT OF SCOPE**, with concise evidence or reason. An unrun check must never be counted as a pass.

### OPERATE
Consider real-world use: ownership, failure detection, fallback, recovery, backup, maintenance, and support only to the level justified by risk.

### LEARN
Check whether the solution actually improved the original problem. Capture lessons that are likely to be useful again. Once an accepted release is closed, avoid adding features indefinitely: consider a new baseline/version, keep the README current, and archive obsolete supporting material only if useful.

## Core files

Every project created from this template starts with only three required files:

- `README.md` — what the project is and how to use/run it.
- `PROJECT.md` — the engineering source of truth: problem, scope, design, requirements, risks, acceptance criteria, baseline, and changes.
- `AGENTS.md` — working rules for AI coding agents and developers.

Add source-code, test, documentation, or operational folders only when the project actually needs them.

## Two decision gates

### Ready to Build
Before implementation, there should be enough clarity on:

- Problem and desired outcome
- Scope and out of scope
- Important constraints and assumptions
- Chosen design direction
- Acceptance criteria
- Material risks
- For UI-heavy products where interface decisions drive implementation: an accepted UI/UX interaction baseline refined using a representative prototype/preview

The goal is not perfect documentation. The goal is to avoid coding from guesses or integrating expensive infrastructure while fundamental product interaction is still unsettled.

### Ready to Release
Before real use, confirm that:

- Acceptance criteria pass
- No known critical defect remains
- Material risks are handled appropriately
- The target environment works
- Recovery/fallback exists when the risk justifies it
- The owner/user accepts the result
- Any meaningful unverified/deferred checks and residual risks are visible to the owner, not presented as passed tests

## Risk-based controls

GitHub Issues, branches, pull requests, Codex review, automated tests, CI/CD, monitoring, backup, runbooks, and security review are **optional controls**, not mandatory ceremony.

Add them when risk or complexity makes them worthwhile. Examples:

- Use an **Issue** when work must be tracked beyond the current session, a bug needs follow-up, or a dependency/backlog item must not be lost.
- Use a **Pull Request** when independent review is valuable, multiple people contribute, or regression risk is meaningful.
- Use **Codex review** when correctness, regression, data integrity, or relevant security risk justifies an independent review.
- Use **automated tests** when logic is complex, regression risk is high, or repeated verification makes automation worthwhile.
- Use **monitoring, backup, or a runbook** when failure, data loss, or handover would have meaningful consequences.

## Review finding policy

A review finding is a recommendation, not an automatic requirement. Every actionable finding should end in one of three states:

- **FIX** — relevant to the current baseline and worth correcting now.
- **DEFER** — valid, but not required for the current baseline.
- **REJECT** — outside scope, too hypothetical, or adds more complexity than value.

**Zero review findings is not a project KPI.**

## Starting a new project

1. Create a repository from this template.
2. Replace this README with project-specific usage information when appropriate.
3. Complete `PROJECT.md` enough to pass **Ready to Build**.
4. For UI-heavy web apps/products, prototype and refine the important user flows with representative data before substantial integration.
5. Keep `AGENTS.md` unless the project has a concrete reason to amend it.
6. Build the accepted baseline.
7. Verify the integrated baseline against the acceptance criteria.
8. Add controls only when risk or complexity justifies them.
9. After real use, capture useful lessons and refine the next project rather than adding process automatically.

## Reusable bootstrap prompt

Use a short bootstrap prompt instead of copying the process rules into every ChatGPT conversation. The repository remains the source of truth.

```text
Use Project Starter Development Kit for this project.

Repository:
<owner/repository>

Before proceeding:
1. Inspect the repository.
2. Read README.md, PROJECT.md, and AGENTS.md.
3. Treat PROJECT.md as the Engineering Source of Truth.
4. Follow AGENTS.md as the working rules.
5. Identify the current lifecycle stage:
   DEFINE → DESIGN → BUILD → VERIFY → OPERATE → LEARN
6. Summarize the Current State, unresolved decisions/risks, and Next Action.
7. Continue from the project's actual state rather than restarting the process unnecessarily.
8. If chat instructions conflict with the repository baseline, surface the conflict before changing the baseline.
```

## What changed in v0.3

Two completed Android projects (Body Progress V1.0 and Personal Utilities V1.5a) reinforced a few broadly reusable lessons:

- Exercise relevant real-device UI states early, rather than trusting layout previews alone.
- Consider data ownership and delete/uninstall/recovery behavior only when persistent data warrants it.
- Separate build/CI evidence from target-environment evidence, and label deferred tests honestly.
- Close an accepted release deliberately; keep current documentation accurate and put new features in a future baseline when appropriate.

**Unchanged:** The six-stage lifecycle, three core files, two decision gates, optional risk-based controls, and `FIX / DEFER / REJECT` review policy. No mandatory Android stack, checklist, CI workflow, signing system, or additional file was introduced.

## Pilot rule

This kit is still being refined through real projects. Treat **v0.3** as a pilot revision and promote additional rules only when repeated experience or high-severity evidence shows that they consistently prevent real problems or create clear value.
