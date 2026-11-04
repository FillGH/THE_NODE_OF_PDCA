# THE NODE OF PDCA — Project Definition

> **Project Starter Development Kit v0.3** · Engineering Source of Truth  
> **Lifecycle stage: DEFINE (in progress)** · **Baseline: DEFINE draft v0.19**  
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
- **SC-04 — Ease of use (confirmed D-010, D-012):** At least **80% of first-time pilot users overall AND at least 80% in EACH participating department** complete agreed essential tasks **without assistance**, and the **overall average ease-of-use rating is at least 4/5**, using a standard web browser. Department-specific satisfaction thresholds have not been agreed.
- **SC-05 — Visual evidence:** Users can associate images and document references with the applicable PDCA content.
- **SC-06 — Central record:** Authorized factory personnel can retrieve the same saved PDCA from separate devices/sessions.
- **SC-07 — Collaboration:** Multiple authorized users can view and edit the same PDCA, without unreported loss of one another's changes.
- **SC-08 — Pilot-to-scale:** A pilot provides evidence of value and material issues before expansion to the wider factory.

**Confirmed — Pilot success policy: Functional Excellence + Practical Usability (Decision D-009).** Expansion requires every *agreed mandatory functional/data/safety gate* to PASS and the *agreed ease-of-use criteria* to be met. Minor non-blocking defects may be carried forward only when documented and explicitly accepted by the project owner; critical failures, silent loss of work, or unresolved issues that prevent core PDCA tasks cannot count as a PASS. A functional demo alone is insufficient.

**Confirmed — Usability thresholds and aggregation (D-010, D-011, D-012):** First-time users' independent essential-task completion must be **≥80% overall AND ≥80% within every participating department**. Mean ease-of-use rating must be **≥4/5 overall**; no separate department-level rating threshold has been approved. At least **5 first-time pilot testers per department** are required. Specific essential tasks, participant-level success rule, rating wording, and pilot protocol remain to be decided. Timing and efficiency improvements versus Excel are separate proposed measures; no time-savings target is approved.

**Unknown:** Exact essential tasks, how one participant is scored as completing them, survey wording/scale, final participant count (above the confirmed minimum), pilot duration, categorization of mandatory Hard Gates, and the remaining exit criteria for plant-wide rollout. Usability thresholds, minimum testers per department, and both overall and per-department completion aggregation are confirmed (D-010–D-012); participant-level scoring and remaining measurement procedure are not yet agreed.

## 3. Users / Stakeholders

- **Confirmed — Eligible users:** Internal factory personnel only.
- **Confirmed — Pilot group:** Cutting & Packing plus **1–2 additional factory departments** before wider rollout. The other departments and participants are not yet selected.
- **Confirmed — Pilot usability sample (D-011):** At least **5 first-time users per department**. A two-department pilot therefore requires at least 10 testers; a three-department pilot at least 15. Testers should represent actual intended internal users. This is a minimum, not a maximum or a statistical representativeness claim.
- **Confirmed — Collaboration:** Any authorized user can view, create, and edit PDCA records of any department; no department-specific edit restriction.
- **Confirmed — PIC / Owner field:** Indicates responsibility for an activity; does not grant exclusive editing rights.
- **Intended future audience:** Personnel across the entire factory.
- **Unknown:** Which 1–2 additional departments participate, actual tester names/roles and any additional users beyond the 5-per-department minimum, definition of internal personnel for contractor cases, sponsoring owner/approver, and IT/security stakeholders.

## 4. Constraints

**Confirmed**
- Browser-based web usage; ease of use for staff accustomed to everyday web applications.
- One common PDCA categorization and principle across departments.
- A central persistent record, image support, and simultaneous multi-user operation.
- Pilot-first rollout before opening use across the entire factory, starting with Cutting & Packing and 1–2 other departments.
- Authorized access limited to internal factory personnel; sharing does not imply public access.
- **Product delivery strategy (D-013):** Develop THE NODE OF PDCA as a purpose-built application for the factory's needs. **Do not purchase/adopt a new off-the-shelf PDCA/QMS/whiteboard product as the core solution.** Existing market products may inform benchmarking and UX/functional requirements, not replace the planned custom product.
- **Open-source policy (D-014, confirmed):** Existing open-source libraries and frameworks may be used to develop the custom application, subject to license compliance and compatibility with private internal company use. No specific library, framework, architecture, or license is approved yet.
- **Internal-only operation (D-014, confirmed):** The finished application is for authorized internal company use only, not public distribution or external customers. The deployment/access design must enforce that boundary; whether the system is hosted on-premises or in an approved private environment is not yet selected.
- **Host availability (D-015):** Temporary downtime while the host computer is switched off is acceptable. No always-on availability or automatic failover is required. Previously saved PDCA data must remain accessible after service resumes. Offline editing has not been decided.
- **Host restart (D-016):** When the host computer is powered on again, the application must become available automatically, without an operator manually starting the application. The mechanism is deferred to DESIGN.
- **Interim host (D-018):** The owner intends to use their currently available laptop as a temporary host for initial use/testing while it is powered on, before the planned shared local server is ready. This is an approved host preference/operating requirement, **not** evidence that the application is installed or running, that LAN reachability or company IT authorization has been verified, or permission to begin DESIGN/BUILD.
- **Host transition/data portability (D-019):** When moving THE NODE OF PDCA from the interim laptop to the planned local server, **all previously saved project data must move with it**, including text-based PDCA records, node/link relationships, attached images and references to supporting documents where applicable. Previously saved content and connections must remain accessible and intact after the move. Exact storage technology, transfer method, validation procedure, and handling of externally hosted document references are deferred to DESIGN; no migration has yet been performed.
- **Visual evidence expectations (D-020):** Images are primarily staff screenshots/screen captures and real workplace photos. An operational estimate is around **50 images for a single Problem/PDCA case across its constituent nodes**, **not** 50 images per node; this is not a hard cap, and per-node attachment counts are unrestricted at the DEFINE stage. Automatic image compression is acceptable provided evidence remains legible and usable. Exact upload size, storage quota, image format, and compression settings remain unspecified.
- **Node text expectations (D-021):** Text content within an individual Node is normally **a few short paragraphs**, not an essay or multi-page report. Approximately **10,000 characters per Node** is the owner's suggested upper guideline, **not yet a confirmed hard validation limit**; the final enforcement behavior, character-count definition, and treatment of larger records remain open for DESIGN/DEFINE clarification.
- **Document references by hyperlink only (D-022, clarified by D-023):** Do **not** upload or store copies of non-image documents (e.g., PDF, Excel, Word) in THE NODE OF PDCA. Nodes may store references to original documents in existing factory storage or to other relevant online information/data sources. Images remain in scope as stored evidence per D-020. Moving hosts must preserve saved hyperlinks, **not migrate external source files**. Factory systems include Microsoft services and LAN network folders; external internet URLs are also legitimate references. Users will copy/paste links and take responsibility for checking whether references are valid. No automatic link verification, crawling, source integration, or guarantee that a local network-file path launches from a browser is required in Pilot. Clicking a supported link should attempt to open/navigate to its destination; source access remains subject to permissions and network/browser capabilities. Specific protocol compatibility is a DESIGN/IT implementation check, **not a DEFINE blocker**.
- **Shared PDCA collaboration workload (D-024, clarified by D-025):** Cutting & Packing has approximately **10 participants** who may join a table meeting to review **the same PDCA page/case at the same time**. **All 10 may open the same PDCA from their own separate computers and actively edit it simultaneously during the Pilot (D-025).** Changes must not silently overwrite or erase another participant's work; simultaneous-edit correctness must be verified in Pilot. This estimate is **per PDCA case in a meeting**, **not** a factory-wide simultaneous-user cap. Live feedback is specified by D-026, while same-node conflict-resolution behavior remains an open DEFINE question. No specific synchronization technology, performance SLA, or implementation is approved.
- **Automatic live collaboration feedback (D-026):** User expects an experience resembling the factory's Microsoft Excel for the web: while approximately 10 users work in the same PDCA, each user sees **which Node another participant is currently editing** (e.g., editor identity/visible editing state) and sees **completed changes appear automatically on their own screen without manually refreshing**. Show sufficiently prompt feedback to support a live shared meeting. This does **not** imply that every unfinished keystroke must be broadcast, nor establish a millisecond latency SLA. The behavior for two users editing the exact same Node and its collision resolution still needs separate DEFINE; no specific implementation/library is chosen.
- **Operating window and shared-host intent (D-017):** THE NODE OF PDCA is expected to be available whenever its host computer is powered on; no fixed daily service schedule is required. The intended host is a **planned shared company LAN local server for Project Float Monitor and THE NODE OF PDCA**. This machine is **not yet confirmed set up or operational**. The owner plans to work with IT on its setup on 2026-11-05; feasibility, authorization, capacity, configuration compatibility, and impact on Float Monitor remain unverified. This is an operational constraint, not approval of a technology stack or deployment design.
- **Zero-spend constraint (D-014, confirmed):** Do not incur new software license fees, subscriptions, paid SaaS/API usage, paid hosting, or other new monetary charges for this project. Use no-fee components and existing company-approved resources only, subject to verification; a free tier with possible charges or restrictive limits must not be assumed to meet this requirement.

**Unknown**
- Hosting/network policies, identification/login requirements, data retention, exact **image** upload limits and total storage capacity (despite the D-020 estimate), supported devices/browsers, **same-node edit conflict expectations for 10 concurrent editors of one PDCA (D-025, D-026), total factory-wide concurrent-user load**, availability, backup/recovery policy, and corporate security approval.
- **Low-priority implementation check, not a DEFINE blocker (D-023):** Which pasted Microsoft service / LAN shared-folder / internet links browsers can launch, and how to present unsupported/unavailable destinations. User is responsible for link correctness; no automated verification or repair is required.
- Whether the owner's laptop can serve authorized LAN users (network reachability, firewall/security policy, available resources, company IT approval) as an interim host. The requirement to preserve and transfer saved PDCA data when changing hosts is confirmed (D-019); exact transfer method, integrity validation, backup/rollback, and treatment of externally linked documents remain to be defined.
- Whether the planned shared local-server computer for Project Float Monitor and THE NODE OF PDCA can be prepared with IT, without new spending, and whether external connectivity is allowed. A setup attempt with IT is planned for 2026-11-05; outcome, machine specifications, capacity, Float Monitor requirements, IT authorization, and deployment configuration remain unverified. No technical hosting design is approved.
- Development/maintenance ownership, engineering capacity, and internal time/operational resource use. **Zero new monetary spending** is confirmed, but internal labor, existing hardware, electricity, storage, maintenance and opportunity costs still exist and must not be represented as zero total cost.
- Which open-source licenses satisfy company policy and any attribution, notice, redistribution or network-service obligations; license review is required before selecting dependencies.

## 5. Assumptions / Unknowns

### Assumptions (to validate)
- Separating information into distinct linked nodes will improve comprehension and action tracking versus the current Excel row/cell format.
- A common set of categories can cover PDCA use cases from different departments without forcing identical problem-solving paths.
- Pilot feedback will reveal usability issues before plant-wide rollout.

### Important unknowns
- Which additional 1–2 departments, pilot users (minimum 5 first-time testers per department, confirmed D-011), and representative PDCA cases will be selected; how to ensure cross-department representation.
- What proof is sufficient to declare pilot success and proceed to factory rollout.
- Minimum search, history, deletion/restore, reporting, and image/document handling expectations.
- Which access/identity and data-governance rules are required by the factory.
- Who will build, operate and maintain the custom application; which existing company resources can host it without new expenditure, and what internal labor/maintenance capacity is available.
- Which open-source licenses are compatible with internal-only company use and zero-fee operation; no library or framework has yet been selected.

## 6. Scope

### Confirmed product capabilities — intended end state
- [x] Seven categories only (no sub-types currently agreed): **Problem; Fact; Assumption / Hypothesis; Action; Status & Result; Measures to be implemented; Link to document**.
- [x] Free, many-to-many links between nodes across categories, including cross-stage and backward relationships.
- [x] Separate, understandable items for reasons, actions, statuses/results, and measures.
- [x] Action follow-up by individual action, including responsible PIC and relevant dates.
- [x] Stored image evidence as supporting visual information; optional pasted hyperlinks to Microsoft services, LAN shared folders, other original factory documents, or external internet sources (no uploads/copies of non-image files; D-022, D-023).
- [x] Easy-to-use web interface for internal factory users.
- [x] Central, persistent PDCA database/shared records.
- [x] Concurrent collaboration on the same PDCA.
- [x] Common use across departments; open editing for authorized internal users.
- [x] Rollout in **Pilot → evaluate → expand factory-wide**, not an all-factory first release.
- [x] Pilot includes Cutting & Packing together with 1–2 additional departments; exact departments and participants pending.
- [x] Pilot usability sample includes at least 5 first-time users per participating department (D-011).

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

**Confirmed delivery strategy (D-013, D-014):** Build a purpose-made THE NODE OF PDCA application; do not procure a new packaged PDCA, QMS or whiteboard platform as its replacement. Existing **open-source libraries/frameworks are permitted** if license-compatible and no-fee. The completed system is **for authorized internal company use only** and must require **no new monetary spending** on licenses, subscriptions, hosted services or infrastructure. Competitive research remains useful for requirements and benchmarking, **not** for purchasing the core product. Specific dependencies, hosting and implementation choices remain deferred to DESIGN.

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
- **R-09 (D-014):** Build with permitted no-fee open-source libraries/frameworks as appropriate; reject dependencies or services requiring new paid licenses, subscriptions, usage fees or other new spending. Review actual license obligations before adoption.
- **R-10 (D-014):** Restrict deployment and use to authorized internal company personnel; no public-facing or external-customer release is intended.
- **R-11 (D-015):** Temporary downtime when the host is off is acceptable; saved records must persist across that outage.
- **R-12 (D-016):** The shared application must automatically start serving users after the host computer is powered on, without manual application startup.
- **R-13 (D-017):** No fixed daily availability window; provide service while the host computer is on. Target a planned shared company LAN local-server computer for Project Float Monitor and THE NODE OF PDCA, subject to setup, feasibility, IT approval, and non-disruptive co-hosting.
- **R-14 (D-018):** Allow the owner's laptop to be the interim host while powered on, before moving to the planned shared local server, subject to security/IT approval, LAN reachability, and capacity checks.
- **R-15 (D-019):** Preserve and transfer all saved PDCA information when moving from the laptop host to the local server, including node text, links/relationships, stored images, and supporting document references; preserve the ability to retrieve the same content and relationships. Implementation and verification details remain undecided.
- **R-16 (D-020):** Support screenshots and workplace photos as evidence; allow multiple images across nodes within a PDCA, with approximately 50 images per Problem/PDCA case as a non-binding workload estimate, no per-node image-count cap agreed, and acceptable compression without losing evidence readability.
- **R-17 (D-021):** Support concise Node text (typically a few paragraphs); treat 10,000 characters per Node as an indicative maximum-content guideline, not yet an enforced technical limit.
- **R-18 (D-022, D-023):** Allow users to paste optional clickable reference links on Nodes to factory Microsoft services, shared LAN folders, other factory sources, and online information/data sources. Do not upload/duplicate PDF, Excel, Word or other non-image documents; preserve link strings during host migration, not external files. Users check their own references; no automatic link validator is required. Respect existing source permissions and accept that some network paths may not open directly in all browsers; compatibility is a later implementation check, not a major DEFINE priority.
- **R-19 (D-024, D-025):** During the Pilot, support approximately **10 staff on separate computers, each able to open and actively edit the same PDCA case at the same time**. Preserve the integrity of all users' work; no silent lost updates. Live visibility requirements are specified by D-026; handling collisions on the same Node remains to be defined.
- **R-20 (D-026):** Support automatic, no-manual-refresh propagation of completed edits to other currently open clients of the same PDCA, and make the Node currently being edited by another participant visibly identifiable, with an Excel-for-the-web-like collaboration experience. Do not assume per-keystroke streaming or a numerical latency threshold until explicitly defined.

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
| G-08 | Zero new monetary expenditure and license compliance for selected dependencies/deployment (D-014 constraint; verification method proposed) | Dependency/license inventory, zero-fee checks, and company IT confirmation of existing infrastructure |

**Confirmed usability acceptance thresholds (D-010):** At least **80% of first-time pilot users** must complete the agreed essential tasks **without assistance**, and the **average ease-of-use score must be ≥4/5**. Both are required to pass. At least 5 first-time users per department are required (D-011). Task completion must pass **both** the overall pooled rate and **every department's** rate (D-012). The detailed participant-level scoring method, final sample count, essential-task checklist, and rating wording remain open DEFINE decisions.

**Confirmed aggregation (D-012):** Calculate completion percentages using **the actual number of eligible first-time participants in each denominator**. Overall completion uses all participants pooled across participating departments; department completion uses only participants in that department. Each must be **≥80%**, with participant pass counts interpreted using exact fractions (e.g., 4 out of 5 passes). Do **not** substitute an average of departmental percentages for the pooled overall rate.

**Measurement proposal (not yet approved):** Define participant success as completing **all** pre-agreed essential tasks without task-specific guidance; successful participants / tested eligible participants × 100 is then computed overall and for each department. Ease-of-use score = arithmetic mean of one agreed 1–5 rating per participant, currently judged **overall**. Record failures and compare representative performance with Excel as optional diagnostic evidence. These participant-level success rules, survey wording, missing-data handling, and exact task scripts need owner confirmation before testing.

### Proposed Pilot Test Protocol v0.1 — not yet approved

The following is a **DEFINE-stage test protocol candidate**, not a UI/design instruction or a completed test.

- **Participants:** At least 5 first-time users from Cutting & Packing and at least 5 from each of the 1–2 other participating departments (D-011); choose actual intended users with varied familiarity with PDCA and web tools.
- **Materials:** Same agreed scenario complexity and essential-task checklist for all novice testers, supplemented by department-specific real PDCA cases for cross-department fit. A facilitator may give a brief standardized starting explanation but not teach or hint during scored tasks.
- **Candidate essential task E-01:** Create a PDCA with a Problem, separate Facts and Assumptions/Hypotheses, and connect them meaningfully.
- **Candidate essential task E-02:** Add Action(s), create intended many-to-many links, and identify which assumption each action addresses.
- **Candidate essential task E-03:** Set and later locate an Action PIC, relevant due date, and its current status.
- **Candidate essential task E-04:** Record a Status & Result and trace its links backward to the related Action, Hypothesis, Fact, and Problem.
- **Candidate essential task E-05:** Include a visual image and a document reference, then open or locate that evidence.
- **Candidate essential task E-06:** Return to a previously saved PDCA and retrieve its connected information.
- **Confirmed aggregation (D-012):** The independent task-completion success rate must meet **≥80% pooled overall and ≥80% within EACH pilot department**. For a department testing the minimum of 5 users, at least 4 must pass. Overall uses the number of successful unique eligible participants divided by all eligible participants (not an unweighted average of department rates).
- **Proposed participant scoring method:** Mark each essential task PASS/FAIL per first-time participant without in-task coaching. Count one participant as successful only if **all** approved essential tasks pass; the specific success rule remains pending owner agreement.
- **Candidate usability survey:** Each participant answers one agreed ease-of-use question on an anchored 1–5 scale after the tasks; calculate the arithmetic mean and compare to the confirmed ≥4/5 threshold. Agree on question wording and missing-response handling beforehand.
- **Separate Hard Gate evidence:** Data safety, internal-only access, simultaneous edits, persistence and data integrity must also be tested; do not infer them from novice task completion.
- **Recording:** Preserve participant department, task outcomes, failure observations, ease-of-use rating, and noteworthy barriers without collecting unnecessary personal data. Provide aggregated results and issues for the GO / REFINE & RETEST / NO-GO decision.
- **Still undecided:** Exact essential tasks and participant-level success rule, scoring script, pilot session duration, survey details, how to handle incomplete/missing observations, and minimum number of representative real cases. Do not claim generalizable factory-wide adoption from this small pilot sample.

**Draft / Proposed functional scenarios:** No requirement is marked PASS; testing has not started.

| ID | Pilot acceptance scenario (proposed) | Status |
|---|---|---|
| AC-01 | A user links 1 Problem, multiple Facts and Hypotheses, multiple Actions and distinct Results with free many-to-many relationships | NOT TESTED |
| AC-02 | Starting from a Result, a user can trace connected Actions, Hypotheses, Facts, and Problem | NOT TESTED |
| AC-03 | A user can identify the PIC, relevant date, and status/result for a specific Action | NOT TESTED |
| AC-04 | With at least 5 first-time testers per participating department (D-011), **≥80% overall AND ≥80% in each department** independently complete agreed essential tasks (D-012), and overall mean ease-of-use rating is ≥4/5; task script and participant-level scoring method pending | NOT TESTED |
| AC-05 | An image and document reference can be associated with PDCA and retrieved later | NOT TESTED |
| AC-06 | Separate authorized sessions can retrieve the same shared PDCA after saving | NOT TESTED |
| AC-07 | Multiple authorized users can edit a shared PDCA; no edit is silently lost | NOT TESTED |
| AC-08 | Cutting & Packing and the selected 1–2 other departments can apply the same seven-category standard in representative cases; broad-rollout exit threshold TBD | NOT TESTED |
| AC-09 | Proposed: after host shutdown and power-on, the application becomes available automatically without manual application startup, and previously saved PDCA records remain accessible (D-015, D-016) | NOT TESTED |
| AC-10 | Proposed: during the host's powered-on period, THE NODE OF PDCA can be accessed over the authorized company LAN without disrupting Project Float Monitor; subject to verified capacity and IT approval (D-017) | NOT TESTED |
| AC-11 | Proposed: authorized LAN clients can access THE NODE OF PDCA while the interim laptop host is on; stored records can be preserved for a future host transition (D-018). Exact transition procedure TBD | NOT TESTED |
| AC-12 | Proposed: after moving from laptop host to local server, previously saved node texts, relationships, attached images, and document references are retrievable and intact, with no silent loss (D-019). Exact migration test and acceptance method TBD | NOT TESTED |
| AC-13 | Proposed: users can paste and later retrieve reference links to factory Microsoft services, LAN shares, or internet information without uploading documents; an accessible supported URL can be opened. Users validate link correctness themselves; browser/protocol limitations need not block DEFINE (D-022, D-023) | NOT TESTED |
| AC-14 | Proposed: during a Pilot meeting, 10 authorized users on 10 separate computers can open and actively edit one PDCA case concurrently without silent loss of changes (D-024, D-025). Test both edits on different Nodes and overlapping edits on the same Node; exact conflict behavior remains to be specified | NOT TESTED |
| AC-15 | Proposed: a user sees which Node another participant is actively editing and, after the change is completed, updated content appears automatically on other open screens without a manual Refresh during the 10-person Pilot session (D-026). Exact responsiveness threshold and same-Node edit UX remain TBD | NOT TESTED |

## 10. Important Risks

| Risk | Potential consequence | Proposed mitigation to define | Verification TBD |
|---|---|---|---|
| Concurrent edits overwrite changes | Lost work or misleading PDCA | Agree on conflict handling expectations | Multi-user pilot test |
| Open editing causes accidental deletion/change | Loss of records or reasoning trace | Agree on history/recovery expectations | Controlled edit/restore cases |
| Inconsistent use between departments | Failure of common factory standard | Shared categories and pilot learning | Cross-department sample cases |
| Usability too complex for casual users | Low adoption | Representative novice-user evaluation | Observed pilot tasks |
| Sensitive factory information exposed | Confidentiality or compliance impact | Internal access and factory IT/security review | Access validation |
| Shared local host affects Project Float Monitor | Resource contention, port/configuration conflicts or correlated downtime | Check existing host capacity and Float Monitor dependencies with IT before DESIGN | Co-hosting feasibility and non-disruption test (proposed) |
| Interim laptop is unavailable or later replaced | Temporary service outage or risk to locally stored PDCA records | Define laptop security/availability and data preservation for host transition | Proposed interim-host access and data-continuity checks |
| Host migration misses images or graph relationships | Lost evidence or broken reasoning trace after moving from laptop to local server | Define complete migration scope, backup, and integrity verification | Proposed before/after text, relationship, and image retrieval checks |

## 11. Definition of Done

**DEFINE exit (not yet completed):**
- [x] Pilot participant **minimum** agreed: ≥5 first-time testers per department (D-011).
- [ ] Pilot department identities, actual participants and representative cases agreed.
- [ ] Pilot in-scope vs deferred capabilities approved.
- [x] Custom-build product direction confirmed; no off-the-shelf replacement purchase (D-013).
- [x] Open-source frameworks/libraries permitted; internal-only operation and no-new-spending constraint confirmed (D-014).
- [x] Availability whenever host is powered on (no fixed daily window), and intent to share a planned local-server computer with Project Float Monitor confirmed (D-017). Server setup and co-hosting feasibility are NOT confirmed.
- [x] Owner's laptop selected as intended interim host while powered on (D-018); actual network/IT feasibility remains unverified.
- [x] All saved PDCA data, node relationships, images, and supporting document references must be preserved on host transition (D-019); migration method and test evidence remain open.
- [ ] Actual license-compliant dependency policy, shared-host capacity/compatibility, no-new-cost operation, IT approval, and delivery/maintenance ownership verified.
- [x] Pilot success **policy** approved: all mandatory functional gates plus practical usability; minor non-blocking issues can be accepted when documented.
- [x] Usability thresholds approved: first-time task completion ≥80% without assistance and mean ease-of-use rating ≥4/5 (D-010).
- [x] Task completion aggregation approved: both overall and every participating department must independently meet ≥80% (D-012).
- [ ] Specific mandatory Hard Gates, usability measurement protocol, remaining metrics and expansion decision criteria approved.
- [ ] Material operational and security constraints documented.
- [ ] Owner agrees that the project may move to DESIGN.

**Later release acceptance remains subject to the starter-kit Ready to Release gate; no release evidence exists yet.**

## 12. Current Baseline

**Baseline:** DEFINE draft v0.19  
**Status:** Draft — DEFINE in progress  
**Rollout decision:** Pilot-first, with Cutting & Packing and 1–2 additional departments; factory-wide use is the eventual end state. Specific pilot departments and participant identities, hard-gate acceptance details, and usability measurement procedure are not yet decided. Minimum sample size is confirmed: ≥5 first-time users per department (D-011). The two-level exit **policy** (D-009), usability **thresholds** (D-010), and overall-plus-each-department task-completion evaluation (D-012) are confirmed.

**Delivery strategy:** Custom-build the application for the factory (D-013); existing market products are references, not purchase candidates for the core solution. Open-source libraries/frameworks are allowed, finished use is internal-only, and no new monetary spending is permitted (D-014). This is not a claim of zero internal labor or existing-infrastructure cost.

**Host operating expectation:** Available whenever the host is on, with no fixed operating window. The owner's laptop is the intended interim host (D-018), subject to IT/LAN/capacity checks. The intended later host is a planned company LAN local-server computer for both Project Float Monitor and THE NODE OF PDCA (D-017), not yet confirmed set up. An IT-assisted setup attempt is planned for 2026-11-05; compatibility, capacity and IT authorization remain to be checked before any deployment. All saved PDCA data and relationships, including images and document references, must be preserved during the host transition (D-019).

This file records confirmed problem/outcome/access/rollout/delivery decisions and clearly labeled candidate scope/acceptance criteria. No app implementation, production integration, or deployment is authorized by this draft.

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
| D-010 | Ease-of-use Pilot thresholds: ≥80% of first-time users complete agreed essential tasks without assistance; average ease-of-use rating ≥4/5 | Require demonstrable usability before broad factory rollout | 2026-11-04 |
| D-011 | Pilot usability test population: at least 5 first-time users in each participating department (Cutting & Packing plus 1–2 others) | Include multiple perspectives from each department in the pilot | 2026-11-04 |
| D-012 | Require independent task-completion rate ≥80% in the pooled overall pilot population AND separately in every participating department; mean ease-of-use rating ≥4/5 remains an overall criterion | Ensure one department's strong performance cannot mask another department's usability failure | 2026-11-04 |
| D-013 | Custom-build THE NODE OF PDCA for factory-specific needs; do not buy/adopt a new packaged PDCA/QMS/whiteboard product as the core solution | Owner explicitly chose a purpose-built system over purchasing a new tool | 2026-11-04 |
| D-014 | Open-source libraries/frameworks permitted; final product for authorized internal company use only; no new monetary spending on software, subscriptions, services or infrastructure | Owner confirmed internal-only, zero-spend custom-build constraint | 2026-11-04 |
| D-015 | Temporary unavailability while the host computer is off is acceptable; no always-on or automatic failover requirement | Keep availability expectations proportionate to existing resources | 2026-11-04 |
| D-016 | Application must automatically become available after the host computer is powered on, without manually launching the application | Reduce operational steps for internal users | 2026-11-04 |
| D-017 | No fixed operating hours: THE NODE OF PDCA should be available whenever its host is on. Intended host is a planned shared company LAN local server for Project Float Monitor and THE NODE OF PDCA, not yet set up or verified; pending IT and capacity checks | Reuse existing internal resources without new spending; avoid prescribing implementation prematurely | 2026-11-04 |
| D-018 | Owner's currently available laptop is the intended interim host while powered on, before the planned shared LAN local server is ready; feasibility remains unverified | Enable initial testing using existing equipment without assuming infrastructure is already operational | 2026-11-04 |
| D-019 | All previously saved PDCA information must transfer from the interim laptop to the planned local server, preserving node text, relationships, stored images and supporting document references | Prevent loss of work, evidence, and traceability when the host changes | 2026-11-04 |
| D-020 | Support screenshot/workplace-photo evidence; estimate about 50 images per Problem/PDCA case across its nodes (not per Node), without imposing a hard image count limit; automatic image compression acceptable if legibility is retained | Reflect shop-floor evidence patterns without artificially restricting investigations | 2026-11-04 |
| D-021 | Node text is normally a few short paragraphs; 10,000 characters per Node is a suggested upper guideline, not yet a hard validation limit | Capture actual writing needs without prematurely specifying UI or data storage | 2026-11-04 |
| D-022 | Store images as evidence, but do not upload/duplicate other file types; attach hyperlinks to original PDF/Excel/Word/other documents rather than copies. Host migration preserves links, not the external documents | Keep authoritative source files outside the PDCA system while minimizing storage duplication | 2026-11-04 |
| D-023 | Optional pasted references may point to factory Microsoft services, LAN network shares, or public/other internet information and data sources. Users manually cross-check validity; no automated link verification or provider integration required. Link protocol/browser support is a lower-priority implementation check rather than a DEFINE blocker | Preserve simple copy-paste workflow and avoid unnecessary integration scope | 2026-11-04 |
| D-024 | Pilot working scenario: approximately 10 Cutting & Packing staff may simultaneously access/review one PDCA case during a table meeting (clarified by D-025 to include active editing by all 10); not a factory-wide user cap | Set realistic same-PDCA collaboration workload | 2026-11-04 |
| D-025 | All 10 meeting participants can open and actively edit the same PDCA from separate computers simultaneously; no user's changes may be silently overwritten/lost | Enable genuine concurrent collaborative PDCA editing rather than passive group review; live visibility defined by D-026, conflict UX remains open | 2026-11-04 |
| D-026 | Excel-for-the-web-like live collaboration: identify the participant currently editing a Node and automatically show completed edits on all other open clients without Refresh, for the 10-person shared PDCA Pilot. No per-keystroke requirement or precise latency target yet | Preserve awareness and shared context in meetings without manual reloading; same-Node conflicts remain to define | 2026-11-04 |

## 14. Change History

| Version | Change | Reason | Date |
|---|---|---|---|
| DEFINE draft v0.1 | Replaced template placeholders with confirmed user decisions and proposed pilot scope / criteria | Establish traceable requirements before DESIGN | 2026-11-04 |
| DEFINE draft v0.2 | Confirmed pilot group spans Cutting & Packing plus 1–2 other departments; cross-department acceptance scenario updated | Test common standard before scaling | 2026-11-04 |
| DEFINE draft v0.3 | Confirmed the pilot evaluation policy, distinguished mandatory gates from proposed metrics, and documented GO/REFINE/NO-GO logic | Establish decision policy before selecting thresholds and test population | 2026-11-04 |
| DEFINE draft v0.4 | Approved quantitative ease-of-use targets and separated confirmed thresholds from unapproved measurement procedure | Define measurable pilot exit requirements without prematurely specifying test protocol | 2026-11-04 |
| DEFINE draft v0.5 | Confirmed ≥5 first-time usability testers per Pilot department; added a proposed task-based protocol and identified aggregation decision | Make usability testing actionable while retaining DEFINE-stage uncertainties | 2026-11-04 |
| DEFINE draft v0.6 | Confirmed ≥80% task-completion criterion must pass both overall and separately for each pilot department | Avoid cross-department averages masking poor usability | 2026-11-04 |
| DEFINE draft v0.7 | Confirmed custom-build delivery strategy; reframed market research as benchmarking, not procurement, and left component/infrastructure policy open | Honor owner direction without prematurely starting DESIGN or BUILD | 2026-11-04 |
| DEFINE draft v0.8 | Confirmed open-source permission, internal-only deployment/use and zero-new-spend constraint; identified license and existing-infrastructure verification | Establish delivery constraints before technology selection | 2026-11-04 |
| DEFINE draft v0.9 | Confirmed host-off downtime tolerance and automatic service availability after host power-on (D-015, D-016) | Define operational behavior without choosing architecture | 2026-11-04 |
| DEFINE draft v0.10 | Confirmed no fixed operating window and intended reuse of Float Monitor's existing company LAN local server, subject to IT/capacity validation (D-017) | Record shared-host operational requirements without entering DESIGN | 2026-11-04 |
| DEFINE draft v0.11 | Clarified that the shared local server for Float Monitor and THE NODE OF PDCA is planned, not yet operational; owner intends IT-assisted setup attempt on 2026-11-05 | Avoid treating planned infrastructure as available or IT-approved | 2026-11-04 |
| DEFINE draft v0.12 | Confirmed owner's laptop as intended interim host while powered on, pending LAN/IT/capacity verification and data-continuity planning | Record staged hosting intent without beginning DESIGN or BUILD | 2026-11-04 |
| DEFINE draft v0.13 | Confirmed all saved PDCA data must survive host migration, including text, node relationships, images and document references (D-019) | Define data portability requirement before selecting database or file storage | 2026-11-04 |
| DEFINE draft v0.14 | Recorded screenshot/photo evidence expectations, a non-binding estimate of ~50 images per Problem/PDCA case, compression acceptance, and concise Node text with a suggested 10,000-character guideline (D-020, D-021) | Establish realistic content-volume expectations without selecting storage technology or enforcing unapproved limits | 2026-11-04 |
| DEFINE draft v0.15 | Confirmed hyperlink-only references to original factory-storage documents, with no non-image file uploads; identified storage-access validation questions (D-022) | Simplify data storage and preserve original document ownership without locking in a link protocol | 2026-11-04 |
| DEFINE draft v0.16 | Clarified user-pasted links can target Microsoft services, LAN shares, or internet sources; user validates correctness; link compatibility is not a DEFINE blocker (D-023) | Keep reference workflow lightweight and shift focus to important unresolved collaboration requirements | 2026-11-04 |
| DEFINE draft v0.17 | Recorded the approximately 10-person same-PDCA departmental meeting/review workload for Pilot, distinguished viewers from concurrently active editors (D-024) | Size the collaboration requirement from actual operations without guessing 10 simultaneous edits | 2026-11-04 |
| DEFINE draft v0.18 | Confirmed all 10 staff may actively edit the same PDCA from separate computers simultaneously (D-025); updated Pilot acceptance candidate | Distinguish multi-editor synchronization and data-integrity needs from merely concurrent viewing | 2026-11-04 |
| DEFINE draft v0.19 | Confirmed Excel-for-the-web-like automatic change visibility and visual indication of which Node is being edited, with no manual Refresh (D-026) | Define essential collaboration UX without committing to an implementation or hard latency SLA | 2026-11-04 |

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
