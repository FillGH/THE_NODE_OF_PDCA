# THE NODE OF PDCA — Project Definition

> **Project Starter Development Kit v0.3** · Engineering Source of Truth  
> **Lifecycle stage: DEFINE (in progress)** · **Baseline: DEFINE draft v0.3**  
> Last updated: 2026-11-04  
> **Status legend:** Confirmed = owner agreed; Proposed = pending owner confirmation; Unknown = needs resolution.  
> This document records product needs only. No DESIGN or BUILD has been authorized by this update.

## 1. Problem

**Confirmed — Operational problem statement**

Today, PDCA is primarily documented in Excel. One problem may contain many Facts, Assumptions/Hypotheses, Actions, Results, dates, and PICs, with numerous bullet points stored in single cells on the same row. For example, one problem can have 10 facts, 5 hypotheses, and 20 actions with different relationships. Excel's row/cell presentation makes the many-to-many reasoning and work relationships hard to see and maintain.

Consequences:
- Difficult to establish which fact supports which hypothesis, which action tests which hypothesis, and which result belongs to which action.
- Difficult to trace reasoning **backward** from a result to the action, hypothesis, facts, and original problem.
- Individual actions, PICs, dates, and outcomes are hard to follow when recorded inside long multi-item cells.
- As PDCA cases grow, reading, communicating, tracking, and carrying learning forward becomes difficult.

**Problem to solve:** Structure PDCA as individually traceable, freely linkable information rather than many unrelated bullet items inside a spreadsheet row.

## 2. Desired Outcome / Success Criteria

**Confirmed — Desired outcome**

A single, easy-to-use **factory-wide web-based PDCA platform** with one common method across departments. Users can connect Problem → Fact → Assumption/Hypothesis → Action → Status & Result → Measures to be implemented freely (many-to-many), including backward reasoning, images, document links, action follow-up, centralized persistent records, and simultaneous collaboration.

**Proposed — Success criteria to validate during pilot (numeric targets not yet agreed)**

- **SC-01 — Traceability:** A user can follow a Result back through its related Action(s), Hypothesis/Hypotheses, Fact(s), and Problem where those links have been entered.
- **SC-02 — Item-level tracking:** Users can distinguish individual Actions and their PIC, dates, and status/result without reading an entire Excel-style cell.
- **SC-03 — Same standard:** Pilot users follow the same seven categories regardless of their department.
- **SC-04 — Ease of use:** Personnel unfamiliar with node editors can complete core tasks using a standard web browser without specialized training.
- **SC-05 — Visual evidence:** Users can associate images and document references with the applicable PDCA content.
- **SC-06 — Central record:** Authorized factory personnel can retrieve the same saved PDCA from separate devices/sessions.
- **SC-07 — Collaboration:** Multiple authorized users can view and edit the same PDCA, without unreported loss of one another's changes.
- **SC-08 — Pilot-to-scale:** A pilot provides evidence of value and material issues before expansion to the wider factory.

**Confirmed — Pilot success policy: Functional Excellence + Practical Usability (Decision D-009).** Expansion requires every *agreed mandatory functional/data/safety gate* to PASS and the *agreed ease-of-use criteria* to be met. Minor non-blocking defects may be carried forward only when documented and explicitly accepted by the project owner; critical failures, silent loss of work, or unresolved issues that prevent core PDCA tasks cannot count as a PASS. A functional demo alone is insufficient.

**Proposed — Numeric usability targets (not yet approved):** At least 80% of first-time pilot users complete representative essential tasks without assistance; average ease-of-use rating at least 4/5. Time compared to the Excel baseline should be measured before proposing any efficiency gain target. These figures are candidates, not confirmed acceptance thresholds.

**Unknown:** Exact task scripts and scoring, numeric thresholds, pilot participant count and duration, categorization of mandatory gates, and the final exit criteria for the plant-wide rollout.

## 3. Users / Stakeholders

- **Confirmed — Eligible users:** Internal factory personnel only.
- **Confirmed — Pilot group:** Cutting & Packing plus **1–2 additional factory departments** before wider rollout. The other departments, participants, and group size are not yet selected.
- **Confirmed — Collaboration:** Any authorized user can view, create, and edit PDCA records of any department; no department-specific edit restriction.
- **Confirmed — PIC / Owner field:** Indicates responsibility for an activity; does not grant exclusive editing rights.
- **Intended future audience:** Personnel across the entire factory.
- **Unknown:** Which 1–2 additional departments participate in the pilot, pilot participants and user counts, definition of internal personnel for contractor cases, sponsoring owner/approver, and IT/security stakeholders.

## 4. Constraints

**Confirmed**
- Browser-based web usage; ease of use for staff accustomed to everyday web applications.
- One common PDCA categorization and principle across departments.
- A central persistent record, image support, and simultaneous multi-user operation.
- Pilot-first rollout before opening use across the entire factory, starting with Cutting & Packing and 1–2 other departments.
- Authorized access limited to internal factory personnel; sharing does not imply public access.

**Unknown**
- Hosting/network policies, identification/login requirements, data retention, image/file size, supported devices/browsers, concurrent-user volume, cost constraints, availability, backup/recovery policy, and corporate security approval.

## 5. Assumptions / Unknowns

### Assumptions (to validate)
- Separating information into distinct linked nodes will improve comprehension and action tracking versus the current Excel row/cell format.
- A common set of categories can cover PDCA use cases from different departments without forcing identical problem-solving paths.
- Pilot feedback will reveal usability issues before plant-wide rollout.

### Important unknowns
- Which additional 1–2 departments, pilot users, and representative PDCA cases will be selected; how to ensure cross-department representation.
- What proof is sufficient to declare pilot success and proceed to factory rollout.
- Minimum search, history, deletion/restore, reporting, and image/document handling expectations.
- Which access/identity and data-governance rules are required by the factory.

## 6. Scope

### Confirmed product capabilities — intended end state
- [x] Seven categories only (no sub-types currently agreed): **Problem; Fact; Assumption / Hypothesis; Action; Status & Result; Measures to be implemented; Link to document**.
- [x] Free, many-to-many links between nodes across categories, including cross-stage and backward relationships.
- [x] Separate, understandable items for reasons, actions, statuses/results, and measures.
- [x] Action follow-up by individual action, including responsible PIC and relevant dates.
- [x] Image inclusion as supporting visual information; document references.
- [x] Easy-to-use web interface for internal factory users.
- [x] Central, persistent PDCA database/shared records.
- [x] Concurrent collaboration on the same PDCA.
- [x] Common use across departments; open editing for authorized internal users.
- [x] Rollout in **Pilot → evaluate → expand factory-wide**, not an all-factory first release.
- [x] Pilot includes Cutting & Packing together with 1–2 additional departments; exact departments and participants pending.

### Proposed for pilot — not yet approved
- [ ] Create, edit, and connect the seven categories in a representative real PDCA case.
- [ ] View and update PIC, dates, action status, and results separately per action.
- [ ] Add/view images and open document references.
- [ ] Persist and re-open shared records; demonstrate access from different accounts/devices.
- [ ] Perform a simultaneous editing test and identify data-loss/conflict behavior.
- [ ] Find previously recorded PDCA projects (basic search/discovery).
- [ ] Verify basic accountability and recovery needs proportionate to open-edit risks.

### Proposed to defer, subject to owner confirmation
- [ ] AI-generated root causes/actions.
- [ ] ERP or plant-system integration.
- [ ] Native mobile apps.
- [ ] Multi-level approval workflow.
- [ ] Advanced notifications and analytics dashboards.

**Note:** Proposed scope is deliberately not converted into approved requirements until DEFINE decisions are completed.

## 7. Solution / Design

**Current high-level concept only (Confirmed):** A visual PDCA knowledge network with individually linkable nodes, seven fixed categories, and common factory-wide access.

**DESIGN NOT STARTED / NO UI BASELINE ACCEPTED.** Prior standalone prototypes and Blender-inspired visual discussion are exploratory inputs, not implementation authority. Selection of frameworks, database, hosting, conflict-resolution algorithm, exact canvas behaviors, and permissions implementation is deferred to DESIGN after DEFINE is sufficiently complete.

### UI/UX interaction baseline — pending DESIGN
- [ ] Review representative pilot tasks and realistic states.
- [ ] Refine usability with pilot personnel.
- [ ] Record owner-accepted interaction baseline before substantive integration.

### Data lifecycle — unknown
Data ownership, history, retention, recovery, and deletion behavior require DEFINE decisions because this is a collaborative system retaining operational records.

## 8. Requirements

### Confirmed needs (not yet technical specifications)
- **R-01:** Seven shared categories with individually identifiable nodes.
- **R-02:** Free, many-to-many relationships; reasoning and results can be traced in either direction where links exist.
- **R-03:** Actions have individually trackable responsibility, dates, and status/result information.
- **R-04:** Support relevant pictures and links to documents.
- **R-05:** Persist and share PDCA across authorized internal factory personnel.
- **R-06:** Allow simultaneous collaboration, with no department-specific edit ownership.
- **R-07:** Operate through a familiar, easy-to-use web interface.
- **R-08:** Pilot before plant-wide scale-up.

### Requirements pending confirmation
- Identity/accountability; edit history; conflict resolution behavior; deletion/recovery; search; non-functional performance and security thresholds.

## 9. Acceptance Criteria

### Confirmed evaluation policy (D-009)

**Two levels, both necessary:** (1) All owner-approved **Hard Gates** covering functional correctness, central records, cross-department usability, concurrent editing/data integrity, and authorized access must pass; (2) **Practical Usability** must satisfy the owner-approved measured threshold with representative pilot users. Minor issues may remain only when they are documented, assessed as non-blocking, and explicitly accepted. Do not treat an untested or deferred mandatory check as a PASS.

**Pilot exit decision:** **GO** = every mandatory hard gate passes, usability threshold is met, and any residual minor defects are accepted; **REFINE & RETEST** = correctable unmet criteria or usability problems; **NO-GO / HOLD** = material security/data-integrity risks or core failures not adequately controlled. No automatic roll-out decision is implied.

**Candidate mandatory gates — Proposed, not yet locked:**

| Gate | Candidate requirement | Proposed evidence |
|---|---|---|
| G-01 | Many-to-many linkage for a representative complex PDCA case | Model 1 Problem, 10 Facts, 5 Hypotheses and 20 Actions, plus related Results |
| G-02 | Backward reasoning traceability from Result to origin | Trace entered links to Action, Hypothesis, Fact, Problem |
| G-03 | Separate action-level PIC, relevant dates, status/result | Review individual Actions in sample case |
| G-04 | Central persistence across authorized sessions | Save, close, reopen, compare on separate sessions/devices |
| G-05 | Multi-user editing with no silent loss of changes | Concurrent edit scenario and conflict inspection |
| G-06 | Same seven-category method across Pilot departments | Real representative case in Cutting & Packing and each chosen department |
| G-07 | Authorized internal access and no uncontrolled critical data-loss risk | Access checks and a documented data-safety scenario |

**Candidate practical-usability evaluation — Proposed:** essential-task completion by new users (suggested ≥80% without assistance), ease-of-use rating (suggested mean ≥4/5), and measured comparisons with Excel for finding/understanding/tracking actions. Targets and sample size must be agreed before the Pilot; do not assert improvement without a baseline.

**Draft / Proposed functional scenarios:** No requirement is marked PASS; testing has not started.

| ID | Pilot acceptance scenario (proposed) | Status |
|---|---|---|
| AC-01 | A user links 1 Problem, multiple Facts and Hypotheses, multiple Actions and distinct Results with free many-to-many relationships | NOT TESTED |
| AC-02 | Starting from a Result, a user can trace connected Actions, Hypotheses, Facts, and Problem | NOT TESTED |
| AC-03 | A user can identify the PIC, relevant date, and status/result for a specific Action | NOT TESTED |
| AC-04 | A pilot user unfamiliar with node editors can perform a representative case in the web UI; task/time/success threshold TBD | NOT TESTED |
| AC-05 | An image and document reference can be associated with PDCA and retrieved later | NOT TESTED |
| AC-06 | Separate authorized sessions can retrieve the same shared PDCA after saving | NOT TESTED |
| AC-07 | Multiple authorized users can edit a shared PDCA; no edit is silently lost | NOT TESTED |
| AC-08 | Cutting & Packing and the selected 1–2 other departments can apply the same seven-category standard in representative cases; broad-rollout exit threshold TBD | NOT TESTED |

## 10. Important Risks

| Risk | Potential consequence | Proposed mitigation to define | Verification TBD |
|---|---|---|---|
| Concurrent edits overwrite changes | Lost work or misleading PDCA | Agree on conflict handling expectations | Multi-user pilot test |
| Open editing causes accidental deletion/change | Loss of records or reasoning trace | Agree on history/recovery expectations | Controlled edit/restore cases |
| Inconsistent use between departments | Failure of common factory standard | Shared categories and pilot learning | Cross-department sample cases |
| Usability too complex for casual users | Low adoption | Representative novice-user evaluation | Observed pilot tasks |
| Sensitive factory information exposed | Confidentiality or compliance impact | Internal access and factory IT/security review | Access validation |

## 11. Definition of Done

**DEFINE exit (not yet completed):**
- [ ] Pilot user group and representative cases agreed.
- [ ] Pilot in-scope vs deferred capabilities approved.
- [x] Pilot success **policy** approved: all mandatory functional gates plus practical usability; minor non-blocking issues can be accepted when documented.
- [ ] Specific mandatory gates, measures, numeric thresholds, and expansion decision criteria approved.
- [ ] Material operational and security constraints documented.
- [ ] Owner agrees that the project may move to DESIGN.

**Later release acceptance remains subject to the starter-kit Ready to Release gate; no release evidence exists yet.**

## 12. Current Baseline

**Baseline:** DEFINE draft v0.3  
**Status:** Draft — DEFINE in progress  
**Rollout decision:** Pilot-first, with Cutting & Packing and 1–2 additional departments; factory-wide use is the eventual end state. Specific pilot departments/participants and numeric pilot exit thresholds are not yet decided. The two-level exit **policy** is confirmed (D-009).

This file records confirmed problem/outcome/access/rollout decisions and clearly labeled candidate scope/acceptance criteria. No app implementation, production integration, or deployment is authorized by this draft.

## 13. Important Decisions

| ID | Decision | Reason | Date |
|---|---|---|---|
| D-001 | Move from Excel row/cell-heavy PDCA toward individually linkable PDCA nodes | Existing format obscures relationships and action tracking | 2026-11-04 |
| D-002 | Standardize on seven named categories; free many-to-many linkage; no sub-types yet | Common reasoning structure while retaining flexibility | 2026-11-04 |
| D-003 | Target one browser-based central PDCA platform for all factory departments | Shared standard, ease of use, common knowledge | 2026-11-04 |
| D-004 | All authorized users can view/create/edit across departments | Open collaboration rather than department ownership restrictions | 2026-11-04 |
| D-005 | Eligible users are internal factory personnel only | Intended organizational boundary | 2026-11-04 |
| D-006 | Roll out to a pilot first; evaluate before factory-wide expansion | Validate adoption and effectiveness at lower risk | 2026-11-04 |
| D-007 | Remain in DEFINE; hold implementation and technology decisions | Scope and success measures not yet approved | 2026-11-04 |
| D-008 | Pilot with Cutting & Packing plus 1–2 additional departments, then evaluate before factory-wide expansion | Test the shared PDCA standard across departments while controlling rollout risk | 2026-11-04 |
| D-009 | Pilot acceptance policy: Functional Excellence + Practical Usability; all agreed hard gates and usability threshold must pass, while documented and owner-accepted minor non-blocking defects may remain | Avoid declaring success solely on functional completion while retaining proportionate engineering rigor | 2026-11-04 |

## 14. Change History

| Version | Change | Reason | Date |
|---|---|---|---|
| DEFINE draft v0.1 | Replaced template placeholders with confirmed user decisions and proposed pilot scope / criteria | Establish traceable requirements before DESIGN | 2026-11-04 |
| DEFINE draft v0.2 | Confirmed pilot group spans Cutting & Packing plus 1–2 other departments; cross-department acceptance scenario updated | Test common standard before scaling | 2026-11-04 |
| DEFINE draft v0.3 | Confirmed the pilot evaluation policy, distinguished mandatory gates from proposed metrics, and documented GO/REFINE/NO-GO logic | Establish decision policy before selecting thresholds and test population | 2026-11-04 |

---

# Decision Gates

## Ready to Build — NOT MET
- [x] Problem and desired outcome described.
- [ ] Scope, constraints, acceptance thresholds, and important unknowns sufficiently settled.
- [ ] DESIGN and an accepted user-facing interaction baseline completed.
- [ ] Material risks addressed proportionately.

## Ready to Release — NOT APPLICABLE YET
No implementation, testing, pilot, or production release has been authorized or performed.

---

# Lifecycle Reminder

`DEFINE → DESIGN → BUILD → VERIFY → OPERATE → LEARN`

Current stage: **DEFINE**.
