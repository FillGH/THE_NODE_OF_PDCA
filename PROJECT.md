# Project Definition

> **Project Starter Development Kit template revision: v0.3**  
> This file is the **engineering source of truth** for the project.  
> Keep it concise. Add detail only when it improves decisions, implementation, verification, or operation.

## 1. Problem

Describe the real problem in operational terms.

- What is happening today?
- Who is affected?
- Why does it matter?
- What happens if nothing is changed?

**Problem statement:**

> [Write the problem here.]

## 2. Desired Outcome / Success Criteria

Describe the improvement the project is expected to create. Prefer observable or measurable outcomes where practical.

- [ ] [Success criterion 1]
- [ ] [Success criterion 2]

## 3. Users / Stakeholders

Who uses, owns, depends on, approves, or maintains the solution?

- **Primary user(s):** [ ]
- **Owner:** [ ]
- **Other stakeholders:** [ ]

## 4. Constraints

Record constraints that materially affect the solution.

Examples: environment, network, device, security, platform, budget, time, regulations, available skills, external systems.

- [Constraint 1]
- [Constraint 2]

## 5. Assumptions / Unknowns

State assumptions explicitly. Unknowns that could materially change the design should be resolved before or during DESIGN.

### Assumptions
- [Assumption]

### Important unknowns
- [Unknown]

## 6. Scope

### In Scope
- [ ] [Required capability]

### Out of Scope
- [ ] [Explicitly excluded capability]

Do not move an out-of-scope item into the current baseline without an explicit decision.

## 7. Solution / Design

Describe the chosen approach at the level needed to build it correctly.

Include only what is useful, for example:

- User/process flow
- System components
- Data flow
- Trading logic
- Interfaces/integrations
- Key technical choices
- Prototype or mock-up references

**Chosen approach:**

> [Describe the solution here.]

### UI/UX interaction baseline — when applicable

Use this subsection for **user-facing web apps or other UI-heavy products** where late interface changes would create meaningful rework. Delete it when not applicable.

Before substantial backend/database/authentication/infrastructure integration:

- [ ] A lightweight working prototype/preview exists using representative mock data.
- [ ] Important user flows and realistic states have been exercised (e.g., empty, keyboard open, long content, Back navigation when relevant).
- [ ] Information hierarchy, layout, wording, actions, navigation, and responsive behavior have been refined on representative target devices/viewports.
- [ ] Material UI/UX decisions have been accepted by the owner/user.
- [ ] The accepted prototype/baseline is referenced below.

**Accepted UI/UX baseline / prototype reference:**

> [Link, branch, preview, screenshot set, or short description]

This is not a requirement for pixel-perfect styling before coding. It is a checkpoint to avoid expensive integration while the fundamental interaction model is still changing.

If integration is genuinely required to resolve a material UI/UX uncertainty, document that exception instead of forcing an artificial prototype-only decision.

### Data lifecycle — only when persistent data matters

Briefly capture the storage/ownership of important data, what happens on delete/uninstall/reset, and whether backup/restore or migration is required. Delete this subsection if data-loss risk is immaterial. No formal matrix is required.

**Relevant data and lifecycle decisions:** [ ]

### Alternatives / Trade-offs considered

| Option | Benefit | Cost / Risk | Decision |
|---|---|---|---|
| [Option] | [ ] | [ ] | [Choose / Reject] |

Use this table only when alternatives are material. Delete it if unnecessary.

## 8. Requirements

Write requirements that are necessary for the current baseline.

### Functional
- **R1:** [Requirement]

### Non-functional
Add only requirements that matter for this project, such as performance, reliability, security, usability, compatibility, maintainability, or operational constraints.

- **N1:** [Requirement]

## 9. Acceptance Criteria

Acceptance criteria define what evidence is required to consider the baseline correct.

- **AC1:** [Given/when/then or clear pass/fail criterion]
- **AC2:** [Criterion]

Verification may be manual or automated depending on risk and value. For material checks, distinguish **PASS / FAIL / NOT TESTED (including owner-deferred) / OUT OF SCOPE** and keep short evidence or rationale. A build pass does not substitute for target-environment verification.

## 10. Important Risks

Focus on consequences, not paperwork. Ask: **What happens if this is wrong?**

| Risk | Consequence | Control / Mitigation | Verification |
|---|---|---|---|
| [Risk] | [Impact] | [Control] | [Evidence] |

Delete the table if the project has no material risks worth tracking.

## 11. Definition of Done

The current baseline is done when:

- [ ] Acceptance criteria pass.
- [ ] No known critical defect remains.
- [ ] Material risks are handled to an appropriate level.
- [ ] The solution works in its intended environment, with real-device or field evidence when relevant.
- [ ] Material unverified/deferred checks are explicitly assessed rather than counted as passes.
- [ ] Recovery/fallback is defined where the consequence of failure justifies it.
- [ ] The owner/user accepts the result.

Add or remove items when the project context justifies it.

## 12. Current Baseline

**Baseline:** v0.1  
**Status:** Draft / Ready to Build / Building / Verifying / Ready to Release / Operating / Closed

Summarize exactly what this baseline intends to deliver:

> [Baseline summary]

A baseline may change. Changes must be visible and deliberate rather than silently changing requirements during implementation.

## 13. Important Decisions

Record only decisions that would be costly or confusing to rediscover later.

| ID | Decision | Reason | Date |
|---|---|---|---|
| D-001 | [Decision] | [Reason] | YYYY-MM-DD |

Delete this section if there are no important decisions yet.

## 14. Change History

| Version | Change | Reason | Date |
|---|---|---|---|
| v0.1 | Initial baseline | Project start | YYYY-MM-DD |

---

# Decision Gates

## Ready to Build

Implementation may start when there is enough clarity to avoid coding from guesses:

- [ ] Problem and desired outcome are understood.
- [ ] Scope and out of scope are clear enough.
- [ ] Material constraints and assumptions are known.
- [ ] Design direction is sufficient for implementation.
- [ ] Acceptance criteria exist.
- [ ] Material risks have been considered.
- [ ] For UI-heavy products where interface decisions drive implementation, the important user flows have an accepted UI/UX interaction baseline from a representative prototype/preview.

## Ready to Release

Release may proceed when:

- [ ] Acceptance criteria pass with appropriate evidence.
- [ ] No known critical defect remains.
- [ ] Material risks are controlled appropriately.
- [ ] The target environment has been verified independently of compile/CI where runtime behavior matters.
- [ ] Material deferred or unverified tests and residual risks are visible to the owner.
- [ ] Recovery/fallback exists where justified by risk.
- [ ] The owner/user accepts the result.

---

# Lifecycle Reminder

```text
DEFINE → DESIGN → BUILD → VERIFY → OPERATE → LEARN
```

**DEFINE:** Understand the problem and outcome.  
**DESIGN:** Choose scope, trade-offs, solution, and evidence. For UI-heavy products, refine the important interaction/UI baseline before costly integration.  
**BUILD:** Implement the simplest sufficient accepted baseline.  
**VERIFY:** Prove correctness with evidence appropriate to risk.  
**OPERATE:** Use, maintain, detect failure, and recover as needed.  
**LEARN:** Check whether the original problem improved and retain useful lessons.
