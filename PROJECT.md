# THE NODE OF PDCA — Project Definition

> **Project Starter Development Kit v0.3** · Engineering Source of Truth  
> **Lifecycle stage: DEFINE (in progress)** · **Baseline: DEFINE draft v0.29**  
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

**Confirmed — Usability thresholds and aggregation (D-010, D-011, D-012):** First-time users' independent essential-task completion must be **≥80% overall AND ≥80% within every participating department**. Mean ease-of-use rating must be **≥4/5 overall**; no separate department-level rating threshold has been approved. At least **5 first-time pilot testers per department** are required. The per-person success rule is now confirmed (D-054): **100% of designated critical tasks plus ≥80% of all standard tasks**, without assistance. Critical-task *types* are now confirmed (D-055): create/edit/link Node, successful Auto-save, and trace from Result back to Problem. Exact checklist, scripts, survey wording and complete Pilot protocol still require approval. Timing and efficiency improvements versus Excel are separate proposed measures; no time-savings target is approved.

**Unknown:** Exact standardized task checklist and scripts for the agreed critical activities (D-055), survey wording/scale, final participant count above the minimum, categorization of mandatory Hard Gates, and remaining exit criteria for plant-wide rollout. Official Pilot duration is fixed at three working days (D-056), and the real-work scenario count at one PDCA per department (D-057). The per-participant scoring *rule* is confirmed (D-054), but exact task scripts and test administration remain open. Usability thresholds, minimum testers per department, and both overall and per-department completion aggregation are confirmed (D-010–D-012); participant-level scoring and remaining measurement procedure are not yet agreed.

## 3. Users / Stakeholders

- **Confirmed — Eligible users:** Internal factory personnel only.
- **Confirmed — Pilot group:** Cutting & Packing plus **1–2 additional factory departments** before wider rollout. The other departments and participants are not yet selected.
- **Confirmed — Pilot usability sample (D-011):** At least **5 first-time users per department**. A two-department pilot therefore requires at least 10 testers; a three-department pilot at least 15. Testers should represent actual intended internal users. This is a minimum, not a maximum or a statistical representativeness claim.
- **Confirmed — Collaboration:** Any authorized user can view, create, and edit PDCA records of any department; no department-specific edit restriction.
- **Confirmed — PIC / Owner field:** Indicates responsibility for an activity; does not grant exclusive editing rights.
- **Confirmed — Pilot display-name identification (D-032):** Participants type their own display name without a password or Microsoft Account. The name is displayed during collaboration and in revision history, but it is self-declared, not verified identity. Internal-only access must be enforced separately.
- **Confirmed — Scope is one PDCA at a time for Node linking (D-041):** Users may connect Nodes freely only when both Nodes belong to the same PDCA. No direct links between separate PDCA projects in the initial scope.
- **Confirmed — Pilot device baseline (D-052):** Desktop web browsers only, targeting Full HD **1920 × 1080** pixels at **16:9**; Mobile and Tablet interfaces are excluded from the initial Pilot scope.
- **Confirmed — Performance case (D-058):** Validate approximately 200 Nodes per PDCA (not a hard product maximum), including their relationships, while roughly ten users can work on the same PDCA concurrently (D-024/D-025).
- **Confirmed — Directed PDCA links (D-060):** Within one PDCA, each Node link has a source and target. An arrow indicates direction, and users can inspect/traverse links in either direction for reasoning. Link-type taxonomy is not required for Pilot.
- **Confirmed — Link change history (D-061):** Track creation/removal of links, with the participant's entered display name and timestamp, and allow restoration of mistakenly removed links, respecting currently existing Node endpoints and current graph rules. Names are self-declared, not authenticated (D-032).
- **Confirmed — Circular relationships (D-062):** Link cycles are permitted without a special warning, and graph traversal must avoid infinite looping.
- **Confirmed — Concurrent link editing (D-063):** Multiple users can add/remove links in the same PDCA simultaneously; conflicts must not silently discard another user's link changes, and completed updates propagate automatically to collaborators.
- **Confirmed — Unique directed links (D-064):** At most one active directed link from a given source Node A to target Node B (A → B); the reverse link (B → A) is a distinct allowed relationship. Creating duplicate A → B must not produce a second active link, including on concurrent creation.
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
- **Host availability (D-015, clarified by D-029):** Temporary downtime while the host computer is switched off is acceptable. No always-on availability or automatic failover is required. Previously saved PDCA data must remain accessible after service resumes. For the Pilot, editing pauses during LAN/host disconnection and users are warned; unsaved draft preservation is separate (D-030), **not full offline editing**.
- **Host restart (D-016):** When the host computer is powered on again, the application must become available automatically, without an operator manually starting the application. The mechanism is deferred to DESIGN.
- **Interim host (D-018):** The owner intends to use their currently available laptop as a temporary host for initial use/testing while it is powered on, before the planned shared local server is ready. This is an approved host preference/operating requirement, **not** evidence that the application is installed or running, that LAN reachability or company IT authorization has been verified, or permission to begin DESIGN/BUILD.
- **Host transition/data portability (D-019):** When moving THE NODE OF PDCA from the interim laptop to the planned local server, **all previously saved project data must move with it**, including text-based PDCA records, node/link relationships, attached images and references to supporting documents where applicable. Previously saved content and connections must remain accessible and intact after the move. Exact storage technology, transfer method, validation procedure, and handling of externally hosted document references are deferred to DESIGN; no migration has yet been performed.
- **Visual evidence expectations (D-020):** Images are primarily staff screenshots/screen captures and real workplace photos. An operational estimate is around **50 images for a single Problem/PDCA case across its constituent nodes**, **not** 50 images per node; this is not a hard cap, and per-node attachment counts are unrestricted at the DEFINE stage. Automatic image compression is acceptable provided evidence remains legible and usable. Exact upload size, storage quota, image format, and compression settings remain unspecified.
- **Node text expectations (D-021):** Text content within an individual Node is normally **a few short paragraphs**, not an essay or multi-page report. Approximately **10,000 characters per Node** is the owner's suggested upper guideline, **not yet a confirmed hard validation limit**; the final enforcement behavior, character-count definition, and treatment of larger records remain open for DESIGN/DEFINE clarification.
- **Document references by hyperlink only (D-022, clarified by D-023):** Do **not** upload or store copies of non-image documents (e.g., PDF, Excel, Word) in THE NODE OF PDCA. Nodes may store references to original documents in existing factory storage or to other relevant online information/data sources. Images remain in scope as stored evidence per D-020. Moving hosts must preserve saved hyperlinks, **not migrate external source files**. Factory systems include Microsoft services and LAN network folders; external internet URLs are also legitimate references. Users will copy/paste links and take responsibility for checking whether references are valid. No automatic link verification, crawling, source integration, or guarantee that a local network-file path launches from a browser is required in Pilot. Clicking a supported link should attempt to open/navigate to its destination; source access remains subject to permissions and network/browser capabilities. Specific protocol compatibility is a DESIGN/IT implementation check, **not a DEFINE blocker**.
- **Shared PDCA collaboration workload (D-024, clarified by D-025):** Cutting & Packing has approximately **10 participants** who may join a table meeting to review **the same PDCA page/case at the same time**. **All 10 may open the same PDCA from their own separate computers and actively edit it simultaneously during the Pilot (D-025).** Changes must not silently overwrite or erase another participant's work; simultaneous-edit correctness must be verified in Pilot. This estimate is **per PDCA case in a meeting**, **not** a factory-wide simultaneous-user cap. Live feedback is specified by D-026; same-node edit contention is addressed by the approved Node-level temporary lock in D-027. No specific synchronization technology, performance SLA, or implementation is approved.
- **Automatic live collaboration feedback (D-026):** User expects an experience resembling the factory's Microsoft Excel for the web: while approximately 10 users work in the same PDCA, each user sees **which Node another participant is currently editing** (e.g., editor identity/visible editing state) and sees **completed changes appear automatically on their own screen without manually refreshing**. Show sufficiently prompt feedback to support a live shared meeting. This does **not** imply that every unfinished keystroke must be broadcast, nor establish a millisecond latency SLA. The behavior for two users attempting to edit the exact same Node is addressed by the user-approved temporary per-Node edit lock (D-027); no specific implementation/library is chosen.
- **Temporary Node-level edit protection (D-027):** For Pilot, multiple users may edit **different Nodes in one PDCA simultaneously**. When an authorized user begins editing a particular Node, only that user may change that Node until the edit session ends; others can still **view** it and see **who is editing** but cannot edit the same Node concurrently. On finishing/leaving the edit session, release the temporary restriction while respecting the automatic-saving state (D-028) and show completed changes to all open users automatically (D-026). If the editor disconnects or abandons the session, the lock must eventually be released without an indefinite block and without silently losing **saved** work. Unsaved draft preservation and recovery on reconnect are specified in D-030; exact Node-lock expiry/disconnect thresholds remain undecided. This is a **user-approved behavioral requirement**, not a choice of database, lock algorithm, or technology.
- **Excel-for-the-web-like automatic saving (D-028):** Edits to Node content/fields must be saved automatically during the editing workflow, without requiring a manual Save action. Users should be able to distinguish when changes are **saving**, **successfully saved**, or **not successfully saved**; failures or disconnection must not be falsely shown as saved. Once saved, changes become visible to other connected users automatically (D-026). Save interval, latency target, retry policy and storage mechanism remain unselected; offline editing during disconnection is **not** supported for Pilot (D-029), while unsaved drafts are protected and reviewed on reconnection (D-030). Do not treat Excel-web analogy as requiring any particular implementation.
- **LAN disconnection behavior (D-029):** During Pilot, show a clear connection-loss warning and **pause further editing** while factory LAN/host service cannot be reached. Existing successfully saved data stays intact. On reconnect, restore live access only after current state/permission and Node edit eligibility are checked; do not silently commit stale changes. This is an online-first requirement, not offline authoring.
- **Local unsaved-draft protection (D-030):** If LAN disconnects or Auto-save has not completed, retain the text the user already typed as a **temporary local draft on that device/browser** rather than silently losing it. After reconnection, check the user's editing rights and current Node lock/state, then **present the pending draft for the user to review and explicitly confirm before submitting it**. Do not automatically overwrite newer shared data. Exact duration, local storage mechanism, security restrictions, and recovery after full browser/device failure remain DESIGN/IT or subsequent DEFINE concerns; no guarantee of recovery from hardware failure is implied.
- **Multiple tabs on the same PDCA (D-031):** The same user may open one PDCA in multiple browser tabs for review; all tabs remain up to date automatically, but only **one tab per user per PDCA** is authorized to actively edit at a time. Other tabs remain view-only. The user can switch the designated editing tab after current Auto-save / unsaved-draft status is checked; if the editing tab closes/crashes, another tab can regain editing eligibility without losing successfully saved data. This is per-user/per-PDCA and does **not** reduce the 10-person Pilot collaboration target. Tab coordination details are deferred to DESIGN.
- **Self-entered display name (D-032):** Pilot users enter a name with no password or Microsoft login. The entered name identifies who appears to be editing a Node and labels history entries, but is **not authenticated identity**. Authorized internal network/application access remains a separate prerequisite (D-005/D-014). Duplicate-name/session behavior and access enforcement remain for later definition.
- **Saved Node version history (D-033):** Preserve previous saved Node text so users can inspect old versions together with the entered editor display name and change date/time. The name is self-reported and cannot serve as verified audit evidence. History retention and scope beyond Node text are open.
- **Restore previous Node version (D-034):** Allow a user to restore an earlier saved Node version directly, without manual copying. A restore is recorded as a **new current version** and retains all prior history, including the formerly current version. Respect Node edit protection, Autosave, and live updates (D-027, D-028, D-026). Exact restoration interaction and non-text scope remain for later definition.
- **Operating window and shared-host intent (D-017):** THE NODE OF PDCA is expected to be available whenever its host computer is powered on; no fixed daily service schedule is required. The intended host is a **planned shared company LAN local server for Project Float Monitor and THE NODE OF PDCA**. This machine is **not yet confirmed set up or operational**. The owner plans to work with IT on its setup on 2026-11-05; feasibility, authorization, capacity, configuration compatibility, and impact on Float Monitor remain unverified. This is an operational constraint, not approval of a technology stack or deployment design.
- **Zero-spend constraint (D-014, confirmed):** Do not incur new software license fees, subscriptions, paid SaaS/API usage, paid hosting, or other new monetary charges for this project. Use no-fee components and existing company-approved resources only, subject to verification; a free tier with possible charges or restrictive limits must not be assumed to meet this requirement.

- **Recoverable Node deletion (D-035):** Deleting a Node moves it into **Trash (soft delete)** and hides it from the active PDCA, preserving its content and relationships for restoration during the recovery window.
- **Seven-day Trash retention (D-036):** A Node may be restored within **seven days of deletion**. **After seven days**, the system automatically deletes the Node permanently; restoration via Trash is no longer possible. Implementation schedule and separate backup retention/erasure are not yet defined.
- **Delete/restore permissions (D-037):** Every authorized internal user may soft-delete and restore eligible Nodes, consistent with open cross-department editing. Users cannot permanently delete before the seven-day period; expiry is automatic.
- **Non-cascading graph deletion (D-038):** Deleting a Node does not delete any other connected Node. Its edges are hidden in the active graph but preserved while in Trash; restoring the Node restores retained edges where their other endpoints are also active. Once the deleted Node is purged permanently, remove edges belonging to it while other Nodes and unrelated edges remain. Links to other trashed Nodes remain hidden until those endpoints return.
- **Mandatory delete confirmation (D-039):** Before soft delete, display the selected Node's name and the number of its relationships; provide Cancel and explicit Confirm, and state the seven-day restore window. Delete only after confirmation.
**Unknown**
- Hosting/network policies, access control independent of self-declared names, duplicate-name and session policy (D-032), history retention and coverage (D-033/D-034), exact **image** upload limits and total storage capacity (despite the D-020 estimate), supported devices/browsers, **Node-lock expiry, autosave failure/retry, local draft retention/security, cross-tab edit handoff and full-browser-crash behavior (D-027–D-031), total factory-wide concurrent-user load**, availability, backup/recovery policy, and corporate security approval.
- **Low-priority implementation check, not a DEFINE blocker (D-023):** Which pasted Microsoft service / LAN shared-folder / internet links browsers can launch, and how to present unsupported/unavailable destinations. User is responsible for link correctness; no automated verification or repair is required.
- Whether the owner's laptop can serve authorized LAN users (network reachability, firewall/security policy, available resources, company IT approval) as an interim host. The requirement to preserve and transfer saved PDCA data when changing hosts is confirmed (D-019); exact transfer method, integrity validation, backup/rollback, and treatment of externally linked documents remain to be defined.
- Whether the planned shared local-server computer for Project Float Monitor and THE NODE OF PDCA can be prepared with IT, without new spending, and whether external connectivity is allowed. A setup attempt with IT is planned for 2026-11-05; outcome, machine specifications, capacity, Float Monitor requirements, IT authorization, and deployment configuration remain unverified. No technical hosting design is approved.
- Development/maintenance ownership, engineering capacity, and internal time/operational resource use. **Zero new monetary spending** is confirmed, but internal labor, existing hardware, electricity, storage, maintenance and opportunity costs still exist and must not be represented as zero total cost.
- Which open-source licenses satisfy company policy and any attribution, notice, redistribution or network-service obligations; license review is required before selecting dependencies.

**Confirmed focus for DEFINE (D-040):** Prioritize high-impact product/domain decisions. Standard, straightforward modern web-app UI/UX conventions and simple common interactions do not each require a separate owner decision; specifics are to be made and tested in DESIGN rather than treating them as already approved UI mockups.
## 5. Assumptions / Unknowns

### Assumptions (to validate)
- Separating information into distinct linked nodes will improve comprehension and action tracking versus the current Excel row/cell format.
- A common set of categories can cover PDCA use cases from different departments without forcing identical problem-solving paths.
- Pilot feedback will reveal usability issues before plant-wide rollout.

### Important unknowns
- Which additional 1–2 departments, pilot users (minimum 5 first-time testers per department, confirmed D-011), and representative PDCA cases will be selected; how to ensure cross-department representation.
- What proof is sufficient to declare pilot success and proceed to factory rollout.
- Exact PDF report composition/layout and usability task protocol, plus any additional image/document handling constraints. PDF export and hybrid visual-plus-detail content are confirmed (D-047/D-049); search, Node history/restoration and deletion are also confirmed (D-040, D-033–D-039, D-044).
- Which access/identity and data-governance rules are required by the factory.
- Who will build, operate and maintain the custom application; which existing company resources can host it without new expenditure, and what internal labor/maintenance capacity is available.
- Which open-source licenses are compatible with internal-only company use and zero-fee operation; no library or framework has yet been selected.

## 6. Scope

### Confirmed product capabilities — intended end state
- [x] Seven categories only (no sub-types currently agreed): **Problem; Fact; Assumption / Hypothesis; Action; Status & Result; Measures to be implemented; Link to document**.
- [x] Free, many-to-many links between nodes across categories, including cross-stage and backward relationships.
- [x] **Within a single PDCA only**: nodes can link freely inside the same PDCA, including multiple Problem nodes. Direct cross-PDCA Node links are out of initial scope (D-041, D-042).
- [x] Separate, understandable items for reasons, actions, statuses/results, and measures.
- [x] Action follow-up by individual action, including responsible PIC and relevant dates.
- [x] Stored image evidence as supporting visual information; optional pasted hyperlinks to Microsoft services, LAN shared folders, other original factory documents, or external internet sources (no uploads/copies of non-image files; D-022, D-023).
- [x] Easy-to-use web interface for internal factory users.
- [x] Central, persistent PDCA database/shared records.
- [x] Simple retrieval/search for previously saved PDCA projects, following familiar modern web-app usability patterns; no advanced search mode required for initial scope (D-040).
- [x] A PDCA may contain multiple Problem nodes; a single-Problem-per-PDCA rule is not required (D-042).
- [x] All PDCA projects remain editable without a mandatory project-level closure or Completed lock (D-043).
- [x] Whole-PDCA soft delete and recovery within seven days; thereafter automatic permanent purge including contained Nodes and relationships (D-044).
- [x] Automatically create restorable backups of the saved full PDCA dataset (including Node relationships, images and history); initial backups remain on the Host only (D-045, D-046).
- [x] Export a PDCA as PDF containing both its visual Node relationship network and a readable detailed section (D-047, D-049).
- [x] Start new PDCA projects from a blank project; no duplication or shared template feature for Pilot (D-048).
- [x] Concurrent collaboration on the same PDCA.
- [x] Common use across departments; open editing for authorized internal users.
- [x] Rollout in **Pilot → evaluate → expand factory-wide**, not an all-factory first release.
- [x] Pilot includes Cutting & Packing together with 1–2 additional departments; exact departments and participants pending.
- [x] Pilot usability sample includes at least 5 first-time users per participating department (D-011).
- [x] **Full-feature before official Pilot**: all agreed in-scope capabilities must be ready and preliminarily checked first; features explicitly excluded from scope remain excluded (D-050).
- [x] No import of old PDCA Excel data (manual copy/re-entry is acceptable), no one-time or continuous Excel import (D-051).
- [x] Desktop-only Pilot web application targeting **Full HD 1920 × 1080, 16:9**; Mobile and Tablet not required (D-052).
- [x] **Hybrid Pilot:** common standardized task-based tests plus separate real-work PDCA trials in participating departments (D-053).
- [x] Each individual passes standardized tasks only by completing **100% critical tasks and ≥80% total tasks** unassisted (D-054); overall and per-department pass rates remain ≥80% (D-010/D-012).
- [x] Designated critical Pilot task areas are Node create/edit/link, successful automatic saving, and backwards trace from Result to Problem (D-055).
- [x] Official Hybrid Pilot lasts **three working days**, including standardized tests and real departmental PDCA cases (D-056).
- [x] Use **one genuine PDCA project per participating department** during the real-case segment: two or three real projects across the already agreed two or three Pilot departments (D-057).
- [x] Target a **~200 Node/PDCA test workload** with approximately ten concurrent same-PDCA users; 200 is **not a maximum Node limit** (D-058).
- [x] Hybrid network layout: automatic graph arrangement and manual drag/position changes, with saved positions visible consistently across collaborating desktop users (D-059).
- [x] **Directed, untyped edges (D-060):** Show arrows representing source → target; support backward tracing and free within-PDCA directed connections.
- [x] **Link creation/deletion history and restore (D-061):** Show who (self-entered name) changed a link and when; allow mistakenly removed links to be restored if graph rules permit.
- [x] **Circular links allowed (D-062):** Nodes may participate in directed cycles; prevent endless traversal but do not warn or block solely for forming a cycle.
- [x] **Concurrent link modifications (D-063):** Multiple users can create/remove relationships in the same PDCA in parallel, without silent loss; broadcast saved changes.
- [x] **No duplicate same-direction edges (D-064):** One active A → B relationship per ordered Node pair, while B → A is allowed.

**Confirmed Node deletion baseline (D-035–D-039):** Soft-delete Nodes into recoverable Trash for seven days, then purge automatically; any authorized internal user may soft-delete and restore; no earlier manual permanent purge; never cascade deletion to adjacent Nodes; preserve/restore eligible graph edges; confirm with Node name and relationship count.
**Confirmed PDCA-level deletion (D-044):** A user may delete an entire PDCA project, which enters Trash as a unit together with its contained Nodes, images and internal relationships. It can be restored as a whole within seven days; after seven days the entire deleted PDCA is automatically permanently purged from application-accessible records. Purging from separately retained backups is subject to an independent retention policy, not assumed by this decision.
**Confirmed automatic local backup and PDF report direction (D-045–D-049):**
- **D-045:** Automatically back up saved PDCA system records without requiring manual backup initiation, and provide a process for restoring the full application dataset from an available backup. Restore scope includes PDCA/Nodes, relationships, attached images, and retained edit history. Backup schedule, verification and detailed recovery procedure remain to be determined; success after total host-storage failure is not implied.
- **D-046:** Keep backup copies **on the Host computer only** for the initial scope; no cloud, separate backup machine, or off-host replica is required. This accepts the risk that physical failure, loss, ransomware, or total loss of Host storage can destroy both primary data and all backups. Whether to use a separate disk/partition on that same Host is a later design choice, not a confirmed safeguard.
- **D-047:** Allow users to view the PDCA in the web application and **export it to a PDF report** for meetings/management communication; the specific layout remains for DESIGN.
- **D-048:** Every new PDCA starts from an empty project, with **no Duplicate PDCA feature and no Template System** in Pilot.
- **D-049:** The exported PDF is a **hybrid report** including both a visual network of PDCA Nodes/links and readable details of the relevant Nodes. Report formatting, page layout, scaling and precise fields remain for DESIGN.
**Interaction policy:** Future DEFINE question sets should present **at least three clear choices per question** and prioritize material product decisions over standard UI/UX minutiae (owner direction; not a system capability).
**Confirmed Pilot preparation and evaluation (D-050–D-054):**
- **D-050 — Full-feature Pilot:** All previously agreed in-scope features must be available and have passed preliminary checks **before the official Pilot begins**. An internal readiness/dry-run check is permissible, but Pilot testing must not be used as a substitute for delivering accepted features. No previously agreed feature is deferred until after Pilot merely to accelerate launch; only explicitly out-of-scope items are excluded.
- **D-051 — No Excel import:** New PDCA records are created in the application and any needed historical Excel content is re-entered or copied manually. No one-time or continuous Excel-import tool is required.
- **D-052 — Desktop Full HD only:** Deliver the initial Pilot Web Application for desktop browser usage at **1920 × 1080, 16:9**. Do not require Mobile or Tablet support for the Pilot. Responsive behavior outside this target remains a later-scope question rather than a Pilot acceptance criterion.
- **D-053 — Hybrid Pilot test:** Combine (1) a common standardized, independently performed task-based usability test, scored consistently for first-time users, **and** (2) trials with real PDCA problems from participating departments to demonstrate operational fit. Task scores are computed from the standardized portion; real-case suitability and agreed hard gates are evaluated separately.
- **D-054 — Critical + Overall participant pass:** A first-time user's standardized task session **passes** only if they complete **all designated critical tasks (100%) and at least 80% of the entire agreed standard-task checklist**, without assistance. Failing any critical task means that participant does not pass even when overall task success is ≥80%. The resulting count of passing users must meet the prior **≥80% overall AND ≥80% for each Pilot department** criterion (D-010/D-012), plus average ease-of-use ≥4/5 overall. Exact task list and critical designation remain to be approved before testing.
**Confirmed Pilot workload, timing, and visual canvas behavior (D-055–D-059):**
- **D-055 — Critical Tasks:** The critical, no-fail task areas for the standardized novice Pilot test are creating a Node, editing a Node, linking Nodes, obtaining confirmation that edits have been saved through the application's automatic save, and tracing the defined Node relationships backward from a Result to an original Problem. Users must complete every critical task plus ≥80% of the entire standardized checklist without assistance (D-054). This does **not** require a manual Save button (D-028), and all precise instructions and pass/fail observations still need to be defined.
- **D-056 — Official Pilot period:** Run the official Pilot for **three working days** once all confirmed in-scope functions are ready (D-050). Conduct both the standardized and real-work portions within that period (D-053); dates and session allocation remain to be scheduled. Three working days can establish basic feasibility/usability, not long-term reliability.
- **D-057 — Real-work cases:** Each participating department tests **one real PDCA project** during the three-day Pilot. With Cutting & Packing plus 1–2 other departments (D-008), this means **2–3 distinct real PDCA projects** in total. The separate standardized novice usability tests still apply (D-053).
- **D-058 — Test graph scale:** Support a **representative approximately 200-Node PDCA** with its saved links and approximately **ten concurrent active editors** on the same PDCA (D-025). This is a **performance/usability test target, not an enforced maximum**; exact latency/frame-rate benchmarks remain unconfirmed.
- **D-059 — Hybrid graph layout:** Allow automatic positioning/arranging of Nodes and free manual movement by dragging Nodes on the visual canvas. Save user-arranged Node positions as shared PDCA layout state so collaborators viewing the same PDCA see the updated arrangement without Refresh (D-026). Position changes must not silently overwrite another user's edits; automatic layout must be explicit or otherwise avoid unexpected destructive rearrangements. The concrete algorithm and interaction design are deferred to DESIGN.
**Confirmed directed graph and collaborative relationship rules (D-060–D-064):**
- **D-060 — Directed edges:** Connections between Nodes are **arrows (source → target)**. Users can follow links in either direction for investigation; initial links require **no per-link category/relationship type**, and all linked Nodes must belong to the same PDCA (D-041). A reverse-direction edge is semantically a separate directed edge.
- **D-061 — Link history and recovery:** Maintain a history of link creation and removal, with the self-entered display name of the participant who performed each operation and a timestamp (names are not verified identity, D-032). Users can reinstate a link that was removed mistakenly, without restoring an entire PDCA snapshot. Restoration must respect whether both endpoint Nodes are active and the unique-edge rule (D-064). The deletion-history retention period, interaction of manually removed links with Node Trash, and precise conflict messaging remain to be defined; do not assume link history is identical to Node content version history.
- **D-062 — Circular relations:** Permit relationships creating directed cycles (for example Problem → Action → Result → Problem) freely, with **no mandatory circular-link warning**. Visualization, search, reverse trace and related graph traversals must handle cycles safely rather than recurse forever. A separate decision on self-links (A → A) has not been made.
- **D-063 — Parallel relationship operations:** Users can create or remove links in the same PDCA **at the same time**, without requiring an exclusive project-wide link lock. Committed changes appear automatically on other clients (D-026). Concurrent operations on the same ordered pair must resolve without silent loss/false success and notify the affected user of a relevant conflict; exact transaction policy and collision UX remain DESIGN concerns. This does not abolish the distinct **per-Node content edit lock** already agreed (D-027).
- **D-064 — Directed duplicate prevention:** Only one **active** relationship may exist for each ordered pair (source Node, target Node) in a PDCA; if A → B already exists, another A → B is rejected/no-op with clear feedback. B → A remains a separate allowed link. Enforce consistently when users simultaneously add links or restore prior links. Relationship-type taxonomy is absent for Pilot (D-060).
### Proposed for pilot — not yet approved
- [ ] Create, edit, and connect the seven categories in a representative real PDCA case.
- [ ] View and update PIC, dates, action status, and results separately per action.
- [ ] Add/view images and open document references.
- [ ] Persist and re-open shared records; demonstrate access from separate **desktop browser sessions/computers** (no Microsoft account requirement).
- [ ] Perform a simultaneous editing test and identify data-loss/conflict behavior.
- [x] Find previously recorded PDCA projects via a simple, familiar search (D-040); advanced search controls are not required.
- [ ] Verify basic accountability and recovery needs proportionate to open-edit risks.

### Proposed to defer, subject to owner confirmation
- [ ] AI-generated root causes/actions.
- [ ] ERP or plant-system integration.
- [ ] Native mobile apps and any Mobile/Tablet interface (excluded from initial Desktop-only Pilot by D-052).
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

### Data lifecycle — partly confirmed
Saved Node history and restoration are confirmed (D-033/D-034). Node Trash and seven-day purge are confirmed (D-035–D-039); entire-PDCA Trash and seven-day purge are confirmed (D-044). Automatic restorable full-dataset backups are confirmed, stored on the Host only (D-045/D-046); backup frequency, retention, integrity testing, purge/backup interaction, and recovery objectives remain undecided. A complete Host storage failure may destroy both source data and local backups. Data ownership, history retention, additional versioned data, recovery outside accessible backups and security require decisions because operational records are retained.

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
- **R-19 (D-024, D-025):** During the Pilot, support approximately **10 staff on separate computers, each able to open and actively edit the same PDCA case at the same time**. Preserve the integrity of all users' work; no silent lost updates. Live visibility requirements are specified by D-026; simultaneous edits to the same Node are temporarily blocked per D-027.
- **R-20 (D-026):** Support automatic, no-manual-refresh propagation of completed edits to other currently open clients of the same PDCA, and make the Node currently being edited by another participant visibly identifiable, with an Excel-for-the-web-like collaboration experience. Do not assume per-keystroke streaming or a numerical latency threshold until explicitly defined.
- **R-21 (D-027):** During Pilot, prevent two users from changing the **same Node at once** with a temporary per-Node editing restriction, while allowing all 10 users to edit **different Nodes** concurrently. Identify the active editor; allow view-only access for others to the locked Node; release protection after edit completion or eventually after disconnection/abandonment, with no indefinite lock and no silent loss of saved data. Exact lock expiration/recovery mechanics deferred.
- **R-22 (D-028):** Automatically save Node changes without manual Save, analogous to Excel for the web; visibly indicate saving, saved, and unsaved/error states so users can tell whether data reached persistent storage. Never claim success during a failed save/disconnection. Exact save timing and retry behavior remain to be decided; disconnection behavior is D-029/D-030.
- **R-23 (D-029):** On loss of factory LAN/host connectivity during Pilot, alert users and block further edits until reconnection; preserve previously saved data, and validate live session/state before resuming.
- **R-24 (D-030):** Preserve text typed but not yet successfully saved as a temporary draft on the current client during disconnection; on reconnect re-check access and Node editing eligibility, show the draft to the user for review and explicit confirmation before saving, and never silently overwrite shared data.
- **R-25 (D-031):** Permit multiple browser tabs for viewing the same PDCA, auto-updating each; only one tab per user per PDCA can actively edit, with safe handoff after checking saved/pending state and recovery of edit access from another tab if the first closes/fails.
- **R-26 (D-032):** Let Pilot users supply a display name with no password or Microsoft sign-in; use it for visible editor/history labels, never as verified personal identity. Enforce internal-only access independently.
- **R-27 (D-033):** Retain saved Node text revisions with prior content, the editor's self-entered name and modification timestamp. Exact retention and other versioned fields remain unknown.
- **R-28 (D-034):** Restore an earlier saved Node revision as a new revision while retaining the previous current version/history; maintain Node editing protection and avoid silent loss.

- **R-29 (D-035):** Soft-delete Node into Trash, hiding it from ordinary active PDCA while retaining recovery data.
- **R-30 (D-036):** Restore from Trash within seven days; after the period, permanently purge automatically. Backup retention is a separate policy not yet decided.
- **R-31 (D-037):** Any authorized internal user can soft-delete and restore Nodes; no manually forced permanent deletion before expiry.
- **R-32 (D-038):** No cascading deletion of connected Nodes. Hide links of trashed Nodes; restore saved links where both endpoints are active; remove a Node's links after final purge.
- **R-33 (D-039):** Require confirmation with Node name, relationship count and seven-day recovery notice before soft delete.
- **R-34 (D-040):** Provide straightforward searching/discovery of saved PDCA projects with standard modern web-app UX; no advanced filtering modes or bespoke search complexity required for Pilot.
- **R-35 (D-041):** Only allow links between Nodes belonging to the same PDCA. Cross-PDCA Node linking is excluded from the initial scope and may be reconsidered in a future phase.
- **R-36 (D-042):** Permit multiple Problem Nodes in one PDCA with free internal links to relevant other Node categories. Do not enforce one Problem Node per PDCA.
- **R-37 (D-043):** Do not require a PDCA project-level Completed/Closure state that makes the PDCA read-only; all non-deleted PDCA projects remain editable by authorized users. This does not remove the existing 'Status & Result' Node category or temporary Node editing locks.
- **R-38 (D-044):** Support deletion of an entire PDCA project through seven-day recoverable Trash as a single unit, preserving all contained Nodes and internal links during the recovery window. Allow restoration of the entire project within seven days; automatically permanently remove the PDCA and its application-held contents and links after expiry. Keep host-backup retention a separate unresolved policy.
- **R-39 (D-045):** Provide automatic backups of the full saved PDCA application dataset (including Node text, inter-Node links, attached images, history and related project data) and a recovery mechanism to restore from an available valid backup. Define frequency, retention, integrity checks and procedure later.
- **R-40 (D-046):** Store backups exclusively within the Host computer for initial scope; do not require cloud or another machine. Explicitly accept lack of recovery guarantee after total loss of Host storage; do not describe this as protection from physical Host disaster.
- **R-41 (D-047):** Export a saved PDCA project into a PDF report in addition to viewing it through the Web Application, suitable for meeting and management communication.
- **R-42 (D-048):** Creating a new PDCA always starts from an empty project; do not include Duplicate PDCA or reusable template features in Pilot.
- **R-43 (D-049):** PDF export must include both a visual Node-link network and the supporting readable Node details in one hybrid report. Defer exact report design to DESIGN.
- **R-44 (D-050):** Make every already-confirmed *in-scope* product capability available and preliminarily validated before starting the official Pilot; do not rely on feature development during or after the Pilot to satisfy agreed scope. Internal smoke/dry-run checks are permitted ahead of the official Pilot.
- **R-45 (D-051):** Do not implement one-time or recurring Excel PDCA data import. Start PDCA data in this app; copy old Excel content manually when needed.
- **R-46 (D-052):** Target desktop browser interaction at 1920 × 1080 (Full HD), 16:9 in the Pilot; no Mobile/Tablet support obligation for Pilot.
- **R-47 (D-053):** Conduct a Hybrid Pilot that includes a common unassisted standardized task test for each first-time participant and use of real PDCA cases from each participating department; evaluate standardized task scores and real-work evidence distinctly.
- **R-48 (D-054):** Count each eligible Pilot tester as passing the standardized test only when all explicitly tagged critical tasks **AND at least 80% of the total standardized tasks** are completed without assistance. Overall and per-department user-pass thresholds remain ≥80% (D-012); ease-of-use mean remains ≥4/5 overall (D-010). Define exact tasks/critical tagging before tests.
- **R-49 (D-055):** Mark the following task areas critical in the standardized novice Pilot: create Node, edit Node, link Nodes, verify Node's Auto-save succeeds, and trace a Result back through saved relationships to Problem. A participant must complete all critical tasks unassisted (D-054); the exact task script/checklist awaits confirmation.
- **R-50 (D-056):** Schedule the official full-feature Hybrid Pilot for three working days after all confirmed functionality passes preliminary readiness checks; include both standard and real-work evaluations within that duration.
- **R-51 (D-057):** Test one real PDCA from each participating department (Cutting & Packing plus 1–2 other departments), therefore two or three real PDCA projects total, separate from the standard tasks.
- **R-52 (D-058):** Include a ~200-Node/PDCA representative workload with internal links and approximately ten concurrently active editors on that PDCA, without enforcing a 200-Node creation limit. Leave measurable performance thresholds for an agreed Pilot checklist.
- **R-53 (D-059):** Support both automatic graph layout and manual repositioning by dragging individual Nodes. Persist and automatically synchronize saved layout positions for concurrent viewers; protect against silent concurrent changes and unrequested loss of manual positioning.
- **R-54 (D-060):** Represent each link within a PDCA as a directed arrow with source and target. Allow navigation/tracing both ways along stored links; no mandatory relationship type or cross-PDCA links.
- **R-55 (D-061):** Retain link creation/deletion events showing the participant's self-entered display name and modification time; allow restoration of an accidentally deleted link subject to active endpoints and uniqueness. Exact historical retention and deleted-Node interplay remain open.
- **R-56 (D-062):** Permit directed cycles without warning or blocking merely due to a cycle; ensure traversal/rendering avoids infinite loops. Self-referential A → A remains unresolved.
- **R-57 (D-063):** Support simultaneous link creation/removal by multiple authorized users in one PDCA, with saved updates appearing without Refresh and conflicts not causing silent lost changes; retain the separate Node content edit lock policy.
- **R-58 (D-064):** Guarantee uniqueness of active links for an ordered (source, target) Node pair in the same PDCA, while supporting the distinct opposite direction and safe conflict handling during concurrent creation/restore.
### Requirements pending confirmation
- Authentication-free naming risks and independent access control; automatic-backup cadence, retention and test procedure, backup purge interaction, recovery objectives, and wider versioned content; limits of Host-only backups and recovery outside valid available backups; quantitative 200-Node graph performance and security thresholds (D-058), layout conflict handling (D-059), and task execution scripts (D-055). Advanced search is not a Pilot requirement (D-040).
- Link event-history retention and restoration after Node Trash/expiry; whether A → A self-links are permitted; same-edge concurrent create/delete conflict outcomes; accessible bidirectional traversal UX and graph performance with cycles. Directed links, cycles, parallel edits and duplicate prevention are confirmed (D-060–D-064).

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
| G-05 | Multi-user editing with no silent loss of changes; distinct Nodes editable in parallel, same Node temporarily limited to one active editor (D-027) | 10-user concurrent edit scenario, attempted same-Node edit, release/reconnect and data-integrity checks |
| G-06 | Same seven-category method across Pilot departments | Real representative case in Cutting & Packing and each chosen department |
| G-07 | Authorized internal access and no uncontrolled critical data-loss risk | Access checks and a documented data-safety scenario |
| G-08 | Zero new monetary expenditure and license compliance for selected dependencies/deployment (D-014 constraint; verification method proposed) | Dependency/license inventory, zero-fee checks, and company IT confirmation of existing infrastructure |

**Confirmed usability acceptance thresholds (D-010, D-012, D-054):** At least **80% of first-time Pilot users overall AND 80% within each department** must pass the standardized tasks without assistance; each individual passes by completing **every designated critical task and ≥80% of total tasks** (D-054). Overall average ease-of-use remains **≥4/5**. At least five first-time testers per department are required (D-011). The exact checklist, critical-task tagging, final sample, survey wording and scripts are pending.

**Confirmed aggregation (D-012):** Calculate completion percentages using **the actual number of eligible first-time participants in each denominator**. Overall completion uses all participants pooled across participating departments; department completion uses only participants in that department. Each must be **≥80%**, with participant pass counts interpreted using exact fractions (e.g., 4 out of 5 passes). Do **not** substitute an average of departmental percentages for the pooled overall rate.

**Confirmed participant scoring (D-054):** For each eligible first-time user, mark a PASS only when **all critical tasks pass** and **at least 80% of all standard tasks pass**, without task-specific guidance. Calculate successful participants / tested eligible participants × 100, both pooled and by department (D-012). For example, with five tasks where two are designated critical, both critical and at least four of five tasks must pass. This arithmetic example **does not establish the task checklist or critical-task designations**. **Measurement details still proposed:** ease-of-use score = arithmetic mean of a consistent 1–5 rating per participant, judged overall. Final task checklist/classification, survey wording, missing-data handling and exact scripts require owner confirmation.

### Proposed Pilot Test Protocol v0.1 — task list/operational details not yet approved

The following is a **DEFINE-stage test protocol candidate**, not a UI/design instruction or a completed test. The **Hybrid approach** (standardized tasks plus real departmental PDCA trials) and **participant pass rule** are owner-confirmed D-053/D-054; the candidate task identities, which are critical, facilitator script and other procedures still require approval.

- **Participants:** At least 5 first-time users from Cutting & Packing and at least 5 from each of the 1–2 other participating departments (D-011); choose actual intended users with varied familiarity with PDCA and web tools.
- **Official Pilot duration (D-056):** Three working days, including standardized first-time testing and use of real department-specific cases; exact session timetable TBD.
- **Real case count (D-057):** Exactly one real PDCA case per participating department is required in the real-work segment (2–3 in total), separate from the common scored novice tasks.
- **Critical task areas confirmed (D-055):** Node creation, edit, connection, successful Auto-save status, and backward trace from Result through its connected reasoning to Problem. The tasks' exact scripted inputs/observations are not yet confirmed.
- **Materials/method (D-053):** Use the same agreed standardized task set and evaluation method for all novice testers, then separately test suitability with each department's real PDCA problem(s). A facilitator may provide the same opening explanation but may not guide participants during scored standard tasks. Capture real-work feedback and hard-gate results independently of the user task-completion rate.
- **Candidate essential task E-01:** Create a PDCA with a Problem, separate Facts and Assumptions/Hypotheses, and connect them meaningfully.
- **Candidate essential task E-02:** Add Action(s), create intended many-to-many links, and identify which assumption each action addresses.
- **Candidate essential task E-03:** Set and later locate an Action PIC, relevant due date, and its current status.
- **Candidate essential task E-04:** Record a Status & Result and trace its links backward to the related Action, Hypothesis, Fact, and Problem.
- **Candidate essential task E-05:** Include a visual image and a document reference, then open or locate that evidence.
- **Candidate essential task E-06:** Return to a previously saved PDCA and retrieve its connected information.
- **Confirmed aggregation (D-012):** The independent task-completion success rate must meet **≥80% pooled overall and ≥80% within EACH pilot department**. For a department testing the minimum of 5 users, at least 4 must pass. Overall uses the number of successful unique eligible participants divided by all eligible participants (not an unweighted average of department rates).
- **Confirmed participant scoring method (D-054):** Mark every standardized task PASS/FAIL for each unassisted first-time user and predesignate which tasks are **critical**. Count that participant as successful only if **every critical task passes** and **at least 80% of the complete standard checklist passes**; count a participant who fails even one critical task as FAIL regardless of total task percentage. Critical-task list and actual checklist still require approval.
- **Candidate usability survey:** Each participant answers one agreed ease-of-use question on an anchored 1–5 scale after the tasks; calculate the arithmetic mean and compare to the confirmed ≥4/5 threshold. Agree on question wording and missing-response handling beforehand.
- **Separate Hard Gate evidence:** Data safety, internal-only access, simultaneous edits, persistence and data integrity must also be tested; do not infer them from novice task completion.
- **Recording:** Preserve participant department, task outcomes, failure observations, ease-of-use rating, and noteworthy barriers without collecting unnecessary personal data. Provide aggregated results and issues for the GO / REFINE & RETEST / NO-GO decision.
- **Still undecided:** Exact scripted task details and extra noncritical task checklist, detailed scoring procedure, survey details, incomplete/missing observations and participant scheduling. Critical-task areas, three-working-day duration and one-real-PDCA-per-department count are confirmed (D-055–D-057). The hybrid test approach and per-user pass rule are **not** undecided (D-053/D-054). Do not claim generalizable factory-wide adoption from this small sample.

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
| AC-14 | Proposed: during a Pilot meeting, 10 authorized users on 10 separate computers can open and actively edit **different Nodes** in one PDCA concurrently without silent loss of changes (D-024, D-025, D-027). Attempts to edit a locked same Node are prevented and the owner is visible | NOT TESTED |
| AC-15 | Proposed: a user sees which Node another participant is actively editing and, after the change is completed, updated content appears automatically on other open screens without a manual Refresh during the 10-person Pilot session (D-026, D-027). Exact responsiveness threshold remains TBD | NOT TESTED |
| AC-16 | Proposed: when User A edits a Node, User B can view it and identify A but cannot edit it until A finishes; a disconnected/abandoned edit does not lock the Node indefinitely, and saved work is not silently discarded (D-027). Timeout and unsaved-draft policy remain TBD | NOT TESTED |
| AC-17 | Proposed: modify a Node without clicking Save; automatic persistence succeeds, a second authorized session can retrieve the update, and the editing session clearly distinguishes saving, saved, and failed/not-yet-saved states. A simulated save failure must not falsely report success (D-028) | NOT TESTED |
| AC-18 | Proposed: disconnect one of the 10 Pilot clients while editing; the application clearly warns and prevents further edits until connected; successfully saved data remains intact and current shared state is checked on return (D-029) | NOT TESTED |
| AC-19 | Proposed: type into a Node, interrupt connection before Auto-save completes; unsaved text is retained temporarily on that client; after reconnect the user sees and reviews it and must confirm before submission, with current access/Node eligibility revalidated and no silent overwrite (D-030) | NOT TESTED |
| AC-20 | Proposed: same user opens one PDCA in multiple browser tabs; both remain current, but edits are permitted from one tab only. After confirming any pending save/draft, user can switch the editing tab; closing the former tab does not permanently block editing or lose saved data (D-031) | NOT TESTED |
| AC-21 | Proposed: a Pilot user types a display name with no password/Microsoft login; other users see it as an unverified editor label, with internal access controlled separately (D-032) | NOT TESTED |
| AC-22 | Proposed: after multiple Node revisions, users can read earlier saved text together with editor-entered names and timestamps (D-033) | NOT TESTED |
| AC-23 | Proposed: restore an earlier saved Node version as a new revision, leaving the previously current version in history and respecting active edit protection (D-034) | NOT TESTED |
| AC-24 | Proposed: soft-delete sends a selected Node to Trash, hides it from active PDCA, and Restore recovers its contents during retention (D-035) | NOT TESTED |
| AC-25 | Proposed: a soft-deleted Node is restorable within seven days; after expiry the system automatically permanently deletes it and Trash recovery is unavailable (D-036) | NOT TESTED |
| AC-26 | Proposed: authorized internal users can soft-delete and restore while they cannot manually purge before seven days (D-037) | NOT TESTED |
| AC-27 | Proposed: deleting a Node does not delete neighboring Nodes, retains its relationships hidden while in Trash, reactivates eligible links on restore and removes links at purge (D-038) | NOT TESTED |
| AC-28 | Proposed: deletion always requires explicit confirmation presenting the selected Node name, relationship count and seven-day recovery notice; Cancel leaves data unchanged (D-039) | NOT TESTED |
| AC-29 | Proposed: a user finds a previously saved PDCA by straightforward search without needing an advanced query/filter interface (D-040) | NOT TESTED |
| AC-30 | Proposed: the same two Nodes can be linked if they belong to one PDCA; links between two different PDCA projects cannot be created (D-041) | NOT TESTED |
| AC-31 | Proposed: a single PDCA stores and displays more than one Problem Node linked to different Facts, Actions and Results (D-042) | NOT TESTED |
| AC-32 | Proposed: users can continue editing an existing non-deleted PDCA without a project Completed/Closure lock; Status & Result nodes still work and simultaneous same-Node edits are still protected (D-043) | NOT TESTED |
| AC-33 | Proposed: soft-delete an entire PDCA including Nodes and links, recover all within seven days, then observe automated removal and no Trash restoration after expiry; verify other PDCA projects are unaffected (D-044) | NOT TESTED |
| AC-34 | Proposed: an automatic backup is created without a manual request; restore from the available saved backup recovers project/Node content, relationships, images and stored history as a usable full dataset (D-045) | NOT TESTED |
| AC-35 | Proposed: backups reside on the Host computer without requiring cloud/off-host equipment; documentation and Pilot risk acceptance make clear that loss of Host storage can lose all backup copies (D-046) | NOT TESTED |
| AC-36 | Proposed: users can generate a PDF of an existing PDCA while continuing to view it in the Web Application (D-047) | NOT TESTED |
| AC-37 | Proposed: creating a new PDCA starts blank; no Duplicate or Template workflow is offered in Pilot (D-048) | NOT TESTED |
| AC-38 | Proposed: an exported PDF displays both the PDCA Node-link visual network and readable Node information; exact layout is subject to later DESIGN acceptance (D-049) | NOT TESTED |
| AC-39 | Proposed: official Pilot starts only after all confirmed in-scope functions are delivered and passed preliminary readiness checks; explicitly excluded functions need not be built (D-050) | NOT TESTED |
| AC-40 | Proposed: users create PDCA from scratch or manually copy needed old Excel details; no Excel-import function is provided (D-051) | NOT TESTED |
| AC-41 | Proposed: agreed Pilot functional tasks are operable on a desktop browser at Full HD 1920 × 1080, 16:9; mobile/tablet operation is not a Pilot gate (D-052) | NOT TESTED |
| AC-42 | Proposed: each participating department completes both identical standardized novice task tests and a real department PDCA scenario; report their distinct evidence (D-053) | NOT TESTED |
| AC-43 | Proposed: for each novice, all designated critical tasks and at least 80% of standard tasks must pass unassisted; the count of passing users must be ≥80% pooled and ≥80% in each department, with ease-of-use ≥4/5 pooled (D-010, D-012, D-054) | NOT TESTED |
| AC-44 | Proposed: each first-time tester completes all critical tasks unassisted: create, edit, link Node; confirm automatic persistence; trace backward from Result to Problem; all approved scoring rules still apply (D-055) | NOT TESTED |
| AC-45 | Proposed: official full-feature Pilot runs for three working days with standardized and real-department PDCA activities, with evidence captured for both (D-056) | NOT TESTED |
| AC-46 | Proposed: Cutting & Packing and each additional participating department completes one real PDCA case during Pilot, making two to three genuine cases overall (D-057) | NOT TESTED |
| AC-47 | Proposed: a graph of roughly 200 Nodes with links remains functionally usable while roughly ten users operate on the same PDCA; no hard cap at 200 Nodes; specific performance SLA still TBD (D-058) | NOT TESTED |
| AC-48 | Proposed: users can request Auto Layout, drag Nodes to chosen locations, retain saved positions across reopen, and see layout updates automatically on other collaborating desktops without lost edits (D-059) | NOT TESTED |
| AC-49 | Proposed: create A → B and observe directional arrow; reverse-trace from B to A; no link-type input is required and no cross-PDCA edge is allowed (D-060) | NOT TESTED |
| AC-50 | Proposed: create and delete an edge, inspect change records with self-entered name and timestamp, restore the deleted edge when both endpoints are valid; preserve history (D-061) | NOT TESTED |
| AC-51 | Proposed: create a cycle A → B → C → A without warning, then trace and display the cycle without hanging or infinite traversal (D-062) | NOT TESTED |
| AC-52 | Proposed: two or more concurrent users independently create/remove links in one PDCA; saved changes synchronize and same-link conflicts do not silently discard updates (D-063) | NOT TESTED |
| AC-53 | Proposed: after A → B exists, a second A → B cannot create another active edge, while B → A is allowed; same rule holds during simultaneous creation/restoration (D-064) | NOT TESTED |

## 10. Important Risks

| Risk | Potential consequence | Proposed mitigation to define | Verification TBD |
|---|---|---|---|
| Concurrent edits overwrite changes | Lost work or misleading PDCA | Restrict concurrent changes to one editor per Node (D-027) and one editing tab per user/PDCA (D-031) | Multi-user and multi-tab pilot test |
| LAN disconnect during unsaved Auto-save | Lost work or accidental overwrite after reconnect | Stop editing, preserve local pending draft, verify lock/current Node, require review/confirmation (D-029, D-030) | Disconnect/reconnect with unsaved text; check no false saved status and no overwrite |
| Open editing causes accidental deletion/change | Loss of records or reasoning trace | Saved Node version restore (D-033/D-034), soft-delete Trash and seven-day recovery (D-035–D-039); external backup retention TBD | Controlled history, Trash, restore, expiry and linked-Node tests |
| Inconsistent use between departments | Failure of common factory standard | Shared categories and pilot learning | Cross-department sample cases |
| Usability too complex for casual users | Low adoption | Full-feature desktop Pilot readiness; common novice tasks and real operational scenarios (D-050, D-052, D-053), with all critical tasks and ≥80% of standard tasks required per passing participant (D-054) | Pilot scored tasks, real departmental case observations and user feedback |
| Large PDCA graph becomes unreadable or slow with simultaneous edits | Core reasoning and collaboration become impractical | Exercise a ~200-Node case with ~10 concurrent editors and test shared Hybrid Auto/Manual Layout (D-058/D-059); quantitative latency targets pending | Scenario-based load, link traceability and graph-position persistence checks |
| Concurrent add/delete of the same relationship or duplicate edges | Lost graph meaning, contradictory results or duplicate arrows | Enforce unique ordered-pair links and conflict-safe concurrent operations (D-063/D-064); preserve change history and link restoration (D-061) | Multi-user same-edge races, reverse-edge case and deletion/restore tests |
| Cyclic links cause infinite traversal or unusable traces | Frozen UI and misleading PDCA reasoning | Allow cycles but make traversal cycle-safe without blocking valid links (D-062) | Large connected cyclic graph backward/forward trace checks |
| Three-day Pilot misses intermittent reliability failures | Overestimate stability and readiness for factory rollout | Keep all mandatory hard gates and explicit limitations; 3 working days is a bounded Pilot, not proof of long-term reliability (D-056) | Record test coverage and residual risks in GO/REFINE/NO-GO decision |
| Sensitive factory information exposed | Confidentiality or compliance impact | Internal access and factory IT/security review | Access validation |
| Shared local host affects Project Float Monitor | Resource contention, port/configuration conflicts or correlated downtime | Check existing host capacity and Float Monitor dependencies with IT before DESIGN | Co-hosting feasibility and non-disruption test (proposed) |
| Interim laptop is unavailable or later replaced | Temporary service outage or risk to locally stored PDCA records | Define laptop security/availability and data preservation for host transition | Proposed interim-host access and data-continuity checks |
| Host migration misses images or graph relationships | Lost evidence or broken reasoning trace after moving from laptop to local server | Define complete migration scope, backup, and integrity verification | Proposed before/after text, relationship, and image retrieval checks |
| Local Host backup and primary data are lost together | Complete loss of saved PDCA records despite automatic backups | Owner-approved Host-only backup constraint (D-046) explicitly accepts this residual risk; recovery possible only while usable backup remains. Validate scope and restore process (D-045) | Test restore from a surviving local backup; separately record no protection against total Host storage loss |
| Expired Trash records remain inside retained backups | Deleted Node/PDCA data may remain recoverable outside the active application even after seven-day purge | Separate active data expiry (D-036/D-044) from backup retention; define compliant retention/purge handling with IT before deployment | Confirm backup policy does not misrepresent irreversible erasure |

**PDCA-level deletion risk (D-044):** Deleting the whole project affects its contained Nodes and internal links; show clear project-level warning using standard safe-delete UX, preserve as a recoverable unit for seven days, and keep backup-retention policy and final purge validation explicit.
## 11. Definition of Done

**DEFINE exit (not yet completed):**
- [x] Pilot participant **minimum** agreed: ≥5 first-time testers per department (D-011).
- [ ] Pilot department identities, actual participants and representative cases agreed.
- [x] High-level PDCA scope choices: basic search, within-PDCA links, multiple Problem Nodes per PDCA, no closure-based edit lock, and seven-day recoverable whole-PDCA delete (D-040–D-044).
- [ ] Remaining Pilot in-scope vs deferred capabilities approved.
- [x] Pilot readiness scope confirmed: all previously agreed in-scope capabilities ready before official Pilot, no Excel import, Desktop Full HD 16:9 only (D-050–D-052). Exact complete feature inventory and Pilot readiness checklist still require validation.
- [x] Custom-build product direction confirmed; no off-the-shelf replacement purchase (D-013).
- [x] Open-source frameworks/libraries permitted; internal-only operation and no-new-spending constraint confirmed (D-014).
- [x] Availability whenever host is powered on (no fixed daily window), and intent to share a planned local-server computer with Project Float Monitor confirmed (D-017). Server setup and co-hosting feasibility are NOT confirmed.
- [x] Owner's laptop selected as intended interim host while powered on (D-018); actual network/IT feasibility remains unverified.
- [x] All saved PDCA data, node relationships, images, and supporting document references must be preserved on host transition (D-019); migration method and test evidence remain open.
- [x] Pilot self-entered name without password/Microsoft sign-in, Node edit history, and direct version restore approved (D-032–D-034).
- [x] Five Node deletion decisions confirmed: soft delete, seven-day auto purge, open delete/restore permissions, non-cascading link behavior and mandatory confirmation (D-035–D-039).
- [x] Five confirmed product choices: automatic restorable full-dataset Backup, Host-only backup copies, PDF export, no PDCA Duplicate/Template, and PDF hybrid visual-plus-detail report (D-045–D-049).
- [ ] Backup cadence/retention, actual restore testing criteria, local-only data-loss risk and backup-versus-deletion retention treatment accepted by IT/owner.
- [ ] Access restrictions independent of user-entered names, history retention and remaining data-governance risks approved.
- [ ] Actual license-compliant dependency policy, shared-host capacity/compatibility, no-new-cost operation, IT approval, and delivery/maintenance ownership verified.
- [x] Pilot success **policy** approved: all mandatory functional gates plus practical usability; minor non-blocking issues can be accepted when documented.
- [x] Usability thresholds approved: first-time task completion ≥80% without assistance and mean ease-of-use rating ≥4/5 (D-010).
- [x] Task completion aggregation approved: both overall and every participating department must independently meet ≥80% (D-012).
- [x] Hybrid Pilot approach (standard task test plus real department cases) and per-person scoring rule (all critical tasks + ≥80% of all tasks) approved (D-053/D-054).
- [x] Critical task types, Pilot duration (3 working days), real-work cases (one per department), ~200-Node/10-editor workload, and Hybrid graph layout confirmed (D-055–D-059).
- [x] Directed, untyped relationships; link creation/deletion history and recovery; allowed circular links; simultaneous link edits; unique links per ordered pair (D-060–D-064).
- [ ] Confirm interaction of link history and restore with expired/deleted Nodes, link event retention and remaining graph concurrency/cycle safety test details.
- [ ] Confirm exact critical task scripts, noncritical task inventory and observed success criteria; set acceptable load responsiveness before full-feature Pilot (D-055/D-058).
- [ ] Exact standardized and critical task checklists, Pilot scripts and Hard Gates finalized before test.
- [ ] Specific mandatory Hard Gates, remaining usability test administration details (task scripts/observations, noncritical checklist, rating wording), additional metrics and expansion decision criteria approved. Hybrid format, participant success formula and critical task domains already confirmed (D-053/D-054/D-055).
- [ ] Material operational and security constraints documented.
- [ ] Owner agrees that the project may move to DESIGN.

**Later release acceptance remains subject to the starter-kit Ready to Release gate; no release evidence exists yet.**

## 12. Current Baseline

**Baseline:** DEFINE draft v0.29  
**Status:** Draft — DEFINE in progress  
**Rollout decision:** Pilot-first, with Cutting & Packing and 1–2 additional departments; factory-wide use is the eventual end state. Specific Pilot departments and participant identities, hard-gate acceptance details and remaining test scripts/critical task list are not yet decided. The Hybrid Pilot and participant scoring rule are confirmed (D-053/D-054). Minimum sample size is confirmed: ≥5 first-time users per department (D-011). The two-level exit **policy** (D-009), usability **thresholds** (D-010), and overall-plus-each-department task-completion evaluation (D-012) are confirmed.

**Delivery strategy:** Custom-build the application for the factory (D-013); existing market products are references, not purchase candidates for the core solution. Open-source libraries/frameworks are allowed, finished use is internal-only, and no new monetary spending is permitted (D-014). This is not a claim of zero internal labor or existing-infrastructure cost.

**Pilot identity and revision control:** The user enters an unverified name (no Microsoft account or password) for collaboration labels; saved Node text history and restore-as-new-version are required (D-032–D-034). Name entry does not replace internal access controls.

**Host operating expectation:** Available whenever the host is on, with no fixed operating window. The owner's laptop is the intended interim host (D-018), subject to IT/LAN/capacity checks. The intended later host is a planned company LAN local-server computer for both Project Float Monitor and THE NODE OF PDCA (D-017), not yet confirmed set up. An IT-assisted setup attempt is planned for 2026-11-05; compatibility, capacity and IT authorization remain to be checked before any deployment. All saved PDCA data and relationships, including images and document references, must be preserved during the host transition (D-019).

This file records confirmed problem/outcome/access/rollout/delivery decisions and clearly labeled candidate scope/acceptance criteria. No app implementation, production integration, or deployment is authorized by this draft.

**Node deletion:** D-035–D-039 establish recoverable Trash for seven days, automated final removal thereafter, authorized-user delete/restore, no cascade to other Nodes, and explicit confirmation identifying Node and relationship count. No DESIGN or BUILD is authorized.
**Core PDCA boundary (D-040–D-044):** Keep discovery/search simple; links stay within one PDCA; each PDCA can contain multiple Problem Nodes; there is no project-level closure-based edit lock; whole-PDCA deletion uses seven-day recoverable Trash followed by automatic permanent removal. Fine UI/UX decisions follow modern web conventions during DESIGN. No DESIGN or BUILD is authorized.
**Data protection/reporting (D-045–D-049):** Full-dataset automatic backups with restore capability are required, but their location is restricted to the Host; complete Host storage failure may destroy all recovery copies. Web viewing plus PDF hybrid visual-network-and-Node-detail export is required. New PDCA projects start blank; no duplicate/template feature in Pilot. Frequency, report layout and the residual-risk control details remain open. No DESIGN/BUILD authorization is implied.
**Pilot scope/testing (D-050–D-054):** All confirmed in-scope features must be present before the official Pilot; no Excel import; initial testing on Desktop Full HD 1920×1080 at 16:9 only. Use standardized novice tasks plus real departmental PDCA cases. Each tester passes only by completing all predesignated critical tasks and ≥80% of all tasks, without assistance; ≥80% of users overall and in each department must pass, and mean ease-of-use ≥4/5 overall. Critical task domains are confirmed by D-055; exact scripts still pending. DEFINE only; DESIGN/BUILD not authorized.
**Pilot operational confirmation (D-055–D-059):** Mandatory critical tasks span Node creation/editing/linking, confirmation of automatic saving, and reverse Result-to-Problem trace. Official Pilot lasts three working days; use one real PDCA per department. Validate an approximately 200-Node linked PDCA with about ten concurrent users (test target, not creation cap); enable Auto Layout plus manually dragged, persistent and shared Node positions. Fine UX mechanics and numeric responsiveness gates remain for DESIGN/test protocol. Project remains in DEFINE.

**Graph relationship semantics (D-060–D-064):** Connections are directional arrows with no mandatory link taxonomy; link creation/removal is recorded with the self-reported editor name and timestamp and removed links can be restored subject to validity; circular connections are allowed and must not cause endless traversal. Multiple collaborators may edit links simultaneously, with no silent overwrite. One active A → B edge is allowed, and B → A remains a separate permitted edge. Details of collision resolution and link-history retention are deferred. DEFINE continues; no DESIGN/BUILD authorization.
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
| D-026 | Excel-for-the-web-like live collaboration: identify the participant currently editing a Node and automatically show completed edits on all other open clients without Refresh, for the 10-person shared PDCA Pilot. No per-keystroke requirement or precise latency target yet | Preserve awareness and shared context in meetings without manual reloading; same-Node protection defined in D-027 | 2026-11-04 |
| D-027 | Approved temporary Node-level edit lock for Pilot: edit different Nodes concurrently; editing a Node reserves it to one user, other users see editor and cannot edit it until released; release at edit completion and eventually on disconnection/abandonment without indefinitely blocking or losing saved work. Timeout/unsaved changes policy TBD | Protect factual PDCA content from semantic conflicts while supporting 10-person real-time team collaboration | 2026-11-04 |
| D-028 | Adopt Excel-for-the-web-like automatic saving for Node edits rather than a manual Save button, with clear saving/saved/failure indications; persistence success must not be claimed for unsaved work. Disconnection clarified by D-029/D-030 | Make routine PDCA editing effortless while guarding against unnoticed loss of work | 2026-11-04 |
| D-029 | During Pilot LAN/host disconnection, pause further editing and warn user; previously saved work remains preserved and editing resumes after validated reconnection, without full offline authoring | Avoid ambiguous stale writes and lost-update risk during unstable connectivity | 2026-11-04 |
| D-030 | Preserve already-typed unsaved text temporarily on the local client; after reconnect, re-check Node/edit access and present recovered draft for explicit user review/confirmation before saving, never silently overwriting shared updates | Avoid losing partially entered PDCA evidence and prevent unexpected overwrites | 2026-11-04 |
| D-031 | Allow multiple tabs showing the same PDCA and receiving automatic updates, but only one active editing tab per user per PDCA; switch editing tab after checking save status and permit safe recovery if the original tab closes | Keep multi-view review flexible without self-conflicting concurrent edits | 2026-11-04 |
| D-032 | Pilot users enter a self-chosen display name with no password or Microsoft account; show it for editor/history labels but not as verified identity; secure internal access separately | Minimize friction for small Pilot group without pretending usernames authenticate people | 2026-11-04 |
| D-033 | Store past saved Node text versions with editor-entered name and modification time | Allow review of changes and prior content | 2026-11-04 |
| D-034 | Direct restore from an earlier saved Node version creates a new version while preserving the former current version and intervening history | Reverse mistakes without destroying audit trail | 2026-11-04 |
| D-035 | Soft-delete Node into recoverable Trash instead of immediate permanent deletion | Allow recovery from mistaken removal | 2026-11-04 |
| D-036 | Restore soft-deleted Nodes within seven days; automatically permanently delete them after that period | Limit Trash retention while protecting recent work | 2026-11-04 |
| D-037 | All authorized internal users may soft-delete and restore Nodes; no manual permanent deletion before expiry | Preserve open collaboration without premature irreversible action | 2026-11-04 |
| D-038 | Deleting a Node never deletes connected other Nodes; preserve hidden links during Trash, restore eligible links, and remove those links when the Node is finally purged | Protect PDCA relationships and prevent cascading deletions | 2026-11-04 |
| D-039 | Require delete confirmation showing Node name, relationship count and seven-day restore period | Reduce accidental deletion of connected Node information | 2026-11-04 |
| D-040 | Implement simple, familiar PDCA project search/discovery, without advanced search UI; defer ordinary modern UI/UX minutiae to DESIGN and focus DEFINE questions on high-impact product decisions | Keep Pilot usable without spending DEFINE time on low-impact interface choices | 2026-11-04 |
| D-041 | Initially allow Node relationships only within the same PDCA; do not allow links across different PDCA projects | Keep initial graph scope manageable | 2026-11-04 |
| D-042 | One PDCA can contain multiple Problem Nodes, with free links to other applicable Node categories within that PDCA | Support real operational cases involving several interrelated problems | 2026-11-04 |
| D-043 | No PDCA-level Completed/Closure status that locks editing; existing non-deleted PDCA projects remain editable | Avoid unnecessary lifecycle complexity in Pilot | 2026-11-04 |
| D-044 | Permit whole-PDCA soft delete with all contained Nodes/links, seven-day recoverability, then automatic permanent deletion; backup retention remains a separate unresolved policy | Allow safe removal of obsolete/mistaken projects without immediate loss | 2026-11-04 |
| D-045 | Automatically create restorable backups of the full saved PDCA dataset, including Nodes, relationships, images and history; exact backup schedule and restore validation remain undecided | Recover data after software or data corruption while local backup remains intact | 2026-11-04 |
| D-046 | Initially keep backups on the Host computer only; no off-host or cloud backup required, accepting loss risk from complete Host storage failure | Avoid additional infrastructure and spending while explicitly accepting the risk | 2026-11-04 |
| D-047 | Support exporting a PDCA project to PDF as well as viewing it in the Web Application | Facilitate meetings and management reports | 2026-11-04 |
| D-048 | All new PDCA projects begin blank; no Duplicate PDCA or Template System in Pilot | Keep initial creation workflow simple and scope controlled | 2026-11-04 |
| D-049 | Use a Hybrid PDF Report containing both the visual Node-link network and detailed Node information | Make reports suitable for high-level explanation and later reference | 2026-11-04 |
| D-050 | Begin the official Full-feature Pilot only when every agreed in-scope capability is implemented and preliminarily checked; no agreed capability intentionally left for after Pilot | Evaluate the complete intended solution rather than a partial core prototype | 2026-11-04 |
| D-051 | No one-time or ongoing Excel PDCA import. Start new PDCA records in the application; users may manually re-enter/copy Excel data when needed | Avoid unreliable mapping of old spreadsheet records to new node relationships | 2026-11-04 |
| D-052 | Target Desktop Web Browser only at Full HD 1920×1080, aspect ratio 16:9 during Pilot; no Mobile or Tablet support required | Focus usability and layout for actual desktop workstations | 2026-11-04 |
| D-053 | Pilot assessment combines standardized independent task tests across all departments with real PDCA work trials specific to each department | Measure comparable ease of use and actual operational fitness separately | 2026-11-04 |
| D-054 | A first-time tester passes only after finishing 100% of predesignated critical tasks plus ≥80% of every standardized task without help; overall and per-department eligible participant pass rates still ≥80%, mean ease rating ≥4/5 overall | Prevent poor performance on essential functions from being obscured by noncritical task scores | 2026-11-04 |
| D-055 | Critical standardized Pilot task types are create/edit/link Nodes, successfully Auto-save, and trace relationships backward from Result to Problem; individual testers must pass every critical task unassisted | Make core graph reasoning and persistence non-negotiable to usability acceptance | 2026-11-04 |
| D-056 | The official full-feature Hybrid Pilot duration is three working days, after all in-scope capabilities are ready | Keep testing focused and time-bounded while preserving agreed gates | 2026-11-04 |
| D-057 | Use one actual PDCA project per participating department in the real-work Pilot segment; two or three real PDCA projects overall | Exercise operational relevance without overloading the three-day Pilot | 2026-11-04 |
| D-058 | Test representative performance/usability with approximately 200 Nodes in one PDCA and roughly ten concurrent same-PDCA editors; 200 is not a maximum allowed count | Validate realistically complex linked investigations and collaborative usage | 2026-11-04 |
| D-059 | Support Hybrid Layout: automatic arrangement, manual Node dragging, and persistence/shared visibility of saved positions to other viewers; no silent conflict loss | Let teams efficiently arrange large visual networks while maintaining shared layout | 2026-11-04 |
| D-060 | Store directional source → target Node links with visible arrows, support forward/backward tracing, and require no link type classification | Make PDCA reasoning direction explicit while preserving simple relation modeling | 2026-11-04 |
| D-061 | Keep history of link creation/removal with self-declared editor name and timestamp, and enable recovery of accidentally deleted links where endpoints/rules allow | Protect the knowledge graph from accidental changes without requiring whole-PDCA rollback | 2026-11-04 |
| D-062 | Allow circular directed Node relationships without mandatory warning; cycle-aware traversal must not loop endlessly | Represent iterative PDCA reasoning freely while protecting navigation | 2026-11-04 |
| D-063 | Allow multiple users to add/delete links in a shared PDCA concurrently, with automatically visible committed changes and no silently lost conflicts | Preserve collaborative editing of the relationship graph without project-wide locks | 2026-11-04 |
| D-064 | Only one active A → B link per source/target ordered pair; reverse B → A remains independently allowed, including during parallel edits | Avoid redundant arrows while maintaining directional semantics | 2026-11-04 |

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
| DEFINE draft v0.20 | Approved Node-level temporary edit protection with visible editor, concurrent editing of separate Nodes, and eventual release after disconnect without silent loss of saved changes (D-027) | Clarify real-time collision handling without selecting a locking algorithm or starting DESIGN | 2026-11-04 |
| DEFINE draft v0.21 | Confirmed automatic saving of Node edits like Excel for the web, without manual Save, with visible saved/saving/error states (D-028) | Establish a low-friction, loss-aware authoring requirement before DESIGN | 2026-11-04 |
| DEFINE draft v0.22 | Batched three approved collaboration decisions: stop editing on LAN loss, protect/confirm unsaved local drafts on reconnect, and allow multi-tab viewing with one edit tab per user/PDCA (D-029–D-031) | Reduce GitHub update overhead while maintaining data integrity and preserving DEFINE-only stage | 2026-11-04 |
| DEFINE draft v0.23 | Batched three confirmed DEFINE choices: self-entered display names without password/Microsoft login, saved Node edit history, and restore of old versions as new revisions (D-032–D-034) | Keep collaboration easy and errors reversible without equating labels with verified identities | 2026-11-04 |
| DEFINE draft v0.24 | Batched five confirmed Node deletion decisions: Trash soft delete, seven-day auto purge, open delete/restore, preserve neighboring Nodes and links, and explicit confirmation (D-035–D-039) | Set recoverability and graph deletion rules before DESIGN | 2026-11-04 |
| DEFINE draft v0.25 | Batched five confirmed DEFINE decisions: simple search/modern UX defaults, within-PDCA link scope, multiple Problems per PDCA, no closure-based edit lock, and seven-day whole-PDCA Trash (D-040–D-044) | Prioritize material product scope and minimize unnecessary UI-detail decisions | 2026-11-04 |
| DEFINE draft v0.26 | Batched automatic backup, Host-only storage, PDF export, blank-only PDCA creation, and hybrid PDF visualization plus details (D-045–D-049); future questions require three or more choices | Focus important DEFINE decisions and make accepted data-loss tradeoffs explicit before DESIGN | 2026-11-04 |
| DEFINE draft v0.27 | Batched five confirmed decisions: Full-feature Pilot readiness, no Excel import, Desktop-only Full HD 16:9, Hybrid standardized/real-case Pilot, and per-user critical-plus-80% task success (D-050–D-054) | Firm up meaningful Pilot scope and interpretation of existing usability thresholds without prematurely entering DESIGN or BUILD | 2026-11-04 |
| DEFINE draft v0.28 | Batched five confirmed Pilot and graph decisions: critical task categories, three-working-day duration, one real case per department, ~200 Nodes with ~10 editors, and Hybrid saved Auto/Manual Node layout (D-055–D-059) | Fix practical Pilot workload and essential visual-canvas behavior without authorizing DESIGN/BUILD | 2026-11-04 |
| DEFINE draft v0.29 | Batched five approved directed-graph decisions: directed untyped links, link event history and recovery, cyclic relationships, concurrent edge changes, and one active link per ordered pair (D-060–D-064) | Define link integrity, traceability and collaboration behavior without selecting implementation technology | 2026-11-04 |

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
