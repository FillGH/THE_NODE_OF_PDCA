# DESIGN SPEC — THE NODE OF PDCA

> **Stage:** DESIGN (UI/UX and fictional mock-data prototype only)  
> **Baseline requirements:** [../PROJECT.md](../PROJECT.md), DEFINE v0.38; D-001–D-107 and Closure-01–05 remain authoritative.  
> **Checkpoint:** Offline HTML prototype v0.6 (public **sanitized** edition)  
> **Next iteration:** DESIGN v0.7 — *feedback approved as design direction, implementation and acceptance pending*  
> **UI/UX baseline:** NOT YET APPROVED. **BUILD:** NOT AUTHORIZED.  
> **Public repository data policy:** No identifiable workers, non-public operating results, raw company workbooks, or true factory records in this folder.

## 1. Product and stage boundary

THE NODE OF PDCA is a factory-internal, desktop-first PDCA graph workspace. Each PDCA record is represented in the UI as a **Workspace** with its own editable title; **Problem remains one of seven Node types** and a Workspace can contain several Problem Nodes, as approved in DEFINE. A common graph contains Problem, Fact, Assumption / Hypothesis, Action, Status & Result, Measures to be implemented, and Link to document.

**DESIGN permission:** Create screens, interactive client-side mock data, compare alternatives, and validate interaction flow at 1920×1080 desktop. **Not permitted:** Production code or backend/database integration, factory-host deployment, live network collaboration, real personnel/operational records, authentication/infrastructure implementation, or claiming Pilot acceptance evidence. Implementations of live authorization, locking, backup/restore, audit retention and data integrity remain pre-BUILD design/IT work. No new requirements may silently override D-001–D-107.

## 2. Design decisions and UI conventions collected v0.3–v0.6

### 2.1 Visual architecture
- **Canvas-first:** maximize graph space; one compact application header and minimal toolbar. No seven-metric summary band over the canvas.
- In Snap mode, seven distinguishable **soft tinted category lanes** with compact headers. Do not repeat Node type labels on each card.
- Categories can be collapsed and reopened from their own **top header** (never require scrolling to the bottom). Choose an intuitive collapse/expand icon; lane headers may include a **+** for adding a Node in that category.
- Columns may be resized horizontally; in Snap, Card width tracks lane width. Provide horizontal and vertical canvas scrolling, a usable zoom, and **Default View** returning view/layout settings without deleting content.
- Keep **one Workspace selector**; remove the parallel Workspace-vs-Problem/Case selector and duplicate large title. Workspace title identifies the PDCA record; do not remove Problem Nodes.
- Provide a visible Light/Dark theme toggle and accessible font-size adjustment. Do not expose a **Glass on/off button**. An elegant frosted/glass treatment may remain as an implementation detail.
- Node Inspector is a **drawer**, closed by default and opening when a Node is selected; avoid duplicate title displays in the drawer. Its label for long body text is **“Side note (not shown on canvas)”**. Side note remains real searchable/exportable/history-bearing Node content per DEFINE; it appears in Inspector and optional hover, not on Canvas.

### 2.2 Node card content and selection
- Non-Action Card: primarily short **Title**; no number, no category duplicate, no “Source-derived” marker.
- **Action Card vertical allocation: 20% compact top strip / 80% title zone**. Top: left **Status**, center **#Action reference**, right **PIC only** (no 'PIC:' prefix), with PIC area roughly one-third of Card width. Action title should be easily readable and get most of the available area. Optional PIC is permitted to be blank.
- Action's five approved values: **Not Started** (default), In Progress, Completed, Blocked, Canceled. Visual cues: Completed green, Blocked gray, Canceled red; Not Started neutral and In Progress amber; status changes and reopen semantics stay as in DEFINE.
- Minimum Card size supports **two visible lines of text**. For content shorter than allocated space, size should contract where feasible; in manually resized Free Float mode, respect the user's chosen dimensions, subject to minimum bounds.
- One left and one right connector **dot** on each Card. Drag from handle to connect; **no Connect-mode button**. Lines **solid, no arrowheads**, curve smoothly, and join **only** the Card's left/right dots. Relationship data is still directed under D-060, even though arrowheads are hidden; direction must remain discoverable in Inspector/hover/accessibility.
- A selected Card gets a conspicuous elegant **glow** and the highlight transfers to the newly selected Node, synchronized with Inspector selection. Gestures (select, move, handle-link, column resize, card resize, category collapse) must not conflict.

### 2.3 Layout modes and motion
- **Snap:** static category lanes, cards snap/group into their category and respond to column width changes. Collapse/expand and header-create affordances persist.
- **Free Float:** no fixed category columns; freely place and **resize both width and height** of Cards. Use a per-Node colored neon/light orb blended with nearby orbs, visible in **both dark and bright themes**. Preserve a Card's manual Free Float size/position when switching modes and returning.
- **Auto Arrange** works in either mode: place Nodes by category while considering linked neighbors, minimize crossings, reduce overlap, and attempt to route lines around other Cards. It is a **heuristic**, never a guarantee of zero crossings or collisions for all graphs; Card-line collision tests are important. Allow **Undo Layout** after auto arrangement.
- Animate Inspector drawer entrance, Node selection, mode transition, newly created Node scroll/pan-to-center with highlight, and appropriate Card transitions. Respect reduced-motion preferences.
- On canvas vertical scroll down, allow the redundant large header to slide away to give more working room; reappear on scroll up. Keep core controls retrievable.
- **Default View:** reset view configuration (e.g. zoom, pan, collapse and widths, display mode, arrangement policy) without modifying Node text, identifiers, links, PIC, Action Status or source data; make clear if user's manual layout will be affected, and allow undo.

## 3. v0.7 iteration contract (from latest owner feedback)

1. **Demo connectivity:** At least **80% of Nodes in each demo Workspace** have >=1 incoming or outgoing relationship; illustrate a coherent causal story. All AI-inferred sample edges must be clearly marked **DEMO / UNVERIFIED** and never represented as facts from the Excel workbook or as proof of causal truth.
2. **Remove Glass toggle** while keeping premium visual finish.
3. **One Workspace concept**: displayed selected Workspace name doubles as PDCA title. No parallel case/problem selector. Graph Problem Nodes remain.
4. **Free Float per-Node neon**, stronger visible blending on light and dark themes.
5. **Card height follows actual content** with minimum room for two text lines; honor manual Free Float size.
6. **Inspector opens with refined motion** and focus continuity.
7. **Newly created Node is brought into view** via animated pan/center and distinct temporary emphasis.
8. **Solid link curves with no arrowheads**; endpoints exclusively at left/right connector dots (never top/bottom/middle of Card).
9. **Auto-hide upper header while scrolling vertically** in the Canvas, restore on up-scroll.
10. **Auto Arrange is card-aware**: aim to prevent lines crossing through Cards, permit line-line overlap when necessary, and provide Undo.
11. Preserve already requested navigation, multiple fictional Demo Workspaces, keyboard/focus accessibility, Status colors, Snap column resizing, collapsible lanes, floating Card resize, font scaling and unobtrusive transitions.

## 4. Information model and interaction invariants

- **Stable internal Node IDs** are separate from optional human-facing Action numbers. Human-facing reference numbering is shown only on Action cards; not every source Action number is unique across workspaces.
- Action-specific PIC and Due Date remain optional. Reclassification preserves hidden Action fields (D-102), even though category-specific inspector design can differ.
- Node title is required as defined by the established model; long body is **Side note** in the UI, not discarded. Both title and Side note participate in search/export and supported histories.
- Workspaces may be empty; categories may be empty and Nodes may remain unconnected. A demo connectivity goal must **not** become a production requirement that disallows isolated Nodes (D-077).
- Directed cycles among different Nodes are allowed, same-Node self links are forbidden (D-105), duplicate ordered pairs forbidden. Removing arrowheads is only a visual decision.
- Hover notes must not obstruct dragging/connecting; selecting a Node must always reliably open its drawer. Cursor and touch/keyboard states should be considered during refinement.
- The selected Node, inspector, link highlighting, and canvas position share a coherent selection state. Switching workspaces clears/reconciles selection safely.
- Restored zoom/layout must not overwrite saved content. No UI reset or visualization transition is permission to discard actual saved data.

## 5. Prototype and privacy provenance

- `design/prototypes/DESIGN_v0.6.html` is an **offline, public-safe sanitized snapshot** of the v0.6 UI prototype. It keeps the user-interface architecture and representative 4-workspace/186-Node structure, but all workbook-derived Node titles, body text, source references and PIC names have been replaced with synthetic examples. It is **not byte-identical** to the user-tested private prototype and must not be interpreted as a source-data backup.
- The actual user-supplied spreadsheet and original v0.6 HTML version containing derived factory details are **not committed** to this public GitHub repository.
- The generated connections, positions and text are illustrative. A truthful training/example graph must label inferred edges as illustrative, not certified causality.
- Do not copy private personal or proprietary factory content from chat attachments or offline local artifacts to this public repo without explicit company-approved sharing controls.
- When BUILD is authorized, public repo suitability and deployment/license/data boundaries must be revisited with IT separately.

## 6. DESIGN acceptance checklist — NOT YET PASSED

- [ ] All mandatory owner-feedback items can be demonstrated in the v0.7 HTML prototype using fully synthetic data.
- [ ] Click selects every Card reliably; Inspector opens, text can be edited, Glow follows selection and drawer closes/reopens with animation.
- [ ] Both layout modes and workspace switching operate without losing changes inside the mock session.
- [ ] Collapse/expand occurs from top header; resize columns in Snap and Card in Free Float; Undo/Default View preserve Nodes/links/text.
- [ ] New Node auto-scrolls into view and is highlighted; drag connections and link deletion behave consistently with directed graph rules.
- [ ] The demo-coverage calculation for each workspace shows >=80% of Nodes having at least one linked relationship (edges still identified as demo).
- [ ] No arrowheads and no top/bottom/mid-body edge endpoints; line/canvas animations and Auto Arrange avoid or detect Card-line crossings in the test cases.
- [ ] In a dense test (~200 Nodes), graph interaction remains usable at Full HD; performance claims backed by evidence, not screenshots alone.
- [ ] Light/Dark neon styling, per-Node glow, text contrast, reduced-motion and hover Side note behave acceptably.
- [ ] Project Owner reviews the finished interaction and explicitly records acceptance of a DESIGN UI/UX baseline.
- [ ] Mandatory IT/security and technical architecture work remains planned before any separate BUILD approval.

**Stage gate:** No design screenshot, CSS animation, checkpoint commit or user feedback is equivalent to BUILD authorization.
