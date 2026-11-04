# Agent and Developer Working Rules

> **Project Starter Development Kit template revision: v0.3**

This repository follows a lightweight, risk-based engineering process.

`PROJECT.md` is the authoritative statement of intended project behavior, scope, acceptance criteria, risks, and current baseline.

## 1. Work from the project definition

- Read `PROJECT.md` before making material changes.
- Do not expand scope without explicit human approval.
- Do not silently reinterpret requirements to make implementation easier.
- If the code, an issue, a review comment, or an AI suggestion conflicts with `PROJECT.md`, stop and surface the conflict rather than choosing silently.
- Human product and engineering decisions override AI recommendations.

## 2. Prefer the simplest sufficient solution

- Solve the current, demonstrated problem.
- Do not add speculative features.
- Do not introduce abstractions, frameworks, services, dependencies, infrastructure, or configuration for hypothetical future needs.
- Design for known change, not imagined change.
- Preserve working behavior unless the baseline or requirement intentionally changes.
- Complexity must justify its implementation and maintenance cost.

## 3. Use engineering judgment, not ceremony

GitHub Issues, branches, pull requests, Codex review, automated tests, CI/CD, monitoring, backup, runbooks, and additional documentation are controls, not mandatory steps.

Add a control when the project's risk, complexity, collaboration needs, or repeated verification cost makes it valuable.

Do not create process solely because a tool or template makes it available.

## 4. Refine feedback-sensitive design before expensive integration

When a project is **user-facing and UI-heavy**, and late interface changes would force meaningful backend/integration rework, treat UI/UX refinement as part of DESIGN rather than postponing it until the integrated application exists.

Default approach for such work:

1. Create a lightweight working prototype/preview using representative mock data.
2. Exercise the important user flows and realistic states.
3. Refine information hierarchy, layout, wording, actions, navigation, and responsive behavior on representative target devices/viewports.
4. Resolve material interaction decisions with the owner/user.
5. Record the accepted UI/UX baseline or prototype reference in `PROJECT.md`.
6. Do not begin substantial backend, database, authentication, infrastructure, or deployment integration until that baseline is accepted, unless the integration itself is required to resolve a material design uncertainty.

Do not require pixel-perfect styling or exhaustive edge-state polish at this stage. The purpose is to stabilize the fundamental interaction model before integration makes change expensive.

For device-specific interfaces, check realistic interaction states (keyboard, input focus, empty/long content, Back, and device controls as relevant) on a representative real device when mocks cannot prove usability.

If integration is required to answer a real design question, use only enough integration to resolve that uncertainty; do not treat that exception as a reason to build the full production stack early.

For non-UI projects, use an equivalent early artifact only when it materially reduces uncertainty or rework; do not force a UI-style prototype process onto unrelated work.

## 5. Build only when Ready to Build

Before substantial implementation, confirm that `PROJECT.md` provides enough clarity on:

- the problem and desired outcome;
- scope and out of scope;
- material constraints and assumptions;
- the chosen design direction;
- acceptance criteria;
- material risks; and
- for UI-heavy products where interface decisions drive implementation, an accepted UI/UX interaction baseline.

Perfect documentation is not required. Avoid implementing from unresolved guesses that could materially change the solution.

## 6. Build from the accepted baseline

- Implement the simplest sufficient accepted baseline.
- Build in reviewable increments when that materially reduces rework or improves feedback.
- Do not reopen an accepted UI/UX baseline without a concrete requirement, usability finding, or implementation constraint.
- Distinguish fundamental interaction changes from ordinary polish; spacing, minor wording, styling, and visual polish do not automatically invalidate the accepted baseline.
- Keep prototypes clearly separate from production evidence. Final verification must cover the intended integrated system and target environment where those materially affect correctness.

## 7. Verify against evidence

- Verification must map back to acceptance criteria and material risks.
- Use the lightest verification method that provides credible evidence.
- Manual testing is acceptable when it is reliable and proportionate.
- Automate tests when logic, regression risk, repeated execution, money, important data, production impact, or similar consequences justify it.
- Passing compilation or a successful deployment is not by itself evidence that the project outcome is correct.
- Where device, browser, permissions, storage, camera, or similar runtime behavior matters, distinguish build/CI verification from owner/target-environment smoke tests.
- Report material checks as **PASS / FAIL / NOT TESTED (including owner-deferred) / OUT OF SCOPE** with actual evidence or reason. Never manufacture a pass or silently treat a deferred check as passing.

## 8. Review policy

Review is decision support, not an authority.

Focus review on risks relevant to the current baseline, especially:

- correctness;
- regression against intended working behavior;
- data integrity;
- security relevant to the actual project context; and
- failure modes with meaningful consequences.

Do not optimize for zero review findings.

Every actionable finding must be classified as one of:

- **FIX** — relevant to the current baseline and worth correcting now.
- **DEFER** — valid, but intentionally postponed because it is not required for the current baseline.
- **REJECT** — outside scope, too hypothetical, incorrect, or adds more complexity than value.

For DEFER or REJECT, record a short rationale where it will remain visible if the finding matters later.

Avoid repeated review cycles unless a new change or unresolved material risk justifies another review.

## 9. Change control without bureaucracy

A baseline may change when new evidence or requirements justify it.

When a material requirement changes:

1. update `PROJECT.md`;
2. state the reason in the change history or important decisions section when useful;
3. update affected acceptance criteria; and
4. then modify the implementation.

Do not allow the implementation to become the only record of a changed requirement.

## 10. Release responsibly

A release should satisfy the Ready to Release gate in `PROJECT.md` at a rigor level proportionate to risk.

Consider, where relevant:

- target-environment verification;
- smoke testing;
- user/owner acceptance;
- rollback or fallback;
- data backup/recovery;
- operational ownership; and
- failure detection.

Do not add these controls when their cost exceeds the credible consequence they mitigate.

For projects that retain important user data, clarify data ownership and the expected effects of delete, reset/uninstall, update, and recovery where applicable. Test a restore round trip when backup/recovery is a material acceptance criterion. For installable signed apps, protect signing credentials and verify the release/upgrade identity when continued updates matter; never commit private signing material.

## 11. After release

Treat operation as part of engineering.

When useful, observe whether the solution:

- remains correct in real use;
- can be maintained by the intended owner;
- fails in ways not anticipated during design; and
- actually improves the original problem and success criteria.

Capture reusable lessons, but do not turn a one-off event into a permanent core rule unless repeated experience or high severity justifies it.

Once the owner accepts a release, close that baseline rather than continuing to add unrelated features. Keep user-facing release documentation current; archive obsolete support documents if useful, without rewriting history. Documentation-only maintenance does not itself require rebuilding the released application.

## 12. Default decision rule

When multiple approaches satisfy the current project:

> Choose the option that meets the requirements and manages the material risks with the least unnecessary complexity and operational burden.
