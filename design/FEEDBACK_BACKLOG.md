# DESIGN FEEDBACK BACKLOG — THE NODE OF PDCA

> **Stage:** DESIGN · **Last owner feedback:** v0.7 requested after trying offline v0.6  
> **Status key:** `DIRECTION-APPROVED` = requested UI behavior; `PROTOTYPE-CLAIMED` = earlier demo reported it, not reverified in this GitHub checkpoint; `OPEN` = work for v0.7; `RISK` = needs explicit UX trade-off/test; `VERIFIED` = measured with saved evidence.  
> **Source hierarchy:** [PROJECT.md](../PROJECT.md) DEFINE D-001–D-107 > Owner's latest feedback > past mock images/prototype shortcuts.  
> **Public data safety:** Do not commit user factory worksheets, authentic employee names, or confidential industrial observations.

## A. Direction from screenshot reviews (v0.3–v0.5)

| ID | Owner feedback | Design disposition | Status |
|---|---|---|---|
| UX-001 | Header occupies too much space | Compact app header + toolbar; Canvas dominates | DIRECTION-APPROVED |
| UX-002 | Remove top metric summaries | Counts optional in secondary views only | DIRECTION-APPROVED |
| UX-003 | Connect from dots; no Connect button | Drag right handle to another Node's left handle | DIRECTION-APPROVED |
| UX-004 | Distinct category backgrounds | Seven pale Snap lanes | DIRECTION-APPROVED |
| UX-005 | Cards too verbose | Title primary, Side note in drawer/hover; omit category repetition and Source-derived | DIRECTION-APPROVED |
| UX-006 | Status/PIC on Action card | Compact 20% strip: left Status, middle #Number, right PIC-only (1/3 width) | DIRECTION-APPROVED |
| UX-007 | Numbers on Actions only | Other Node types have stable internal IDs but no prominent card number | DIRECTION-APPROVED |
| UX-008 | Connector dots and lines | Exactly 2 dots/card at left and right, smooth solid lines | DIRECTION-APPROVED |
| UX-009 | Selected card Glow | Move highlight and Inspector to clicked Card | DIRECTION-APPROVED |
| UX-010 | Snap / Free Float plus theme toggle | Both modes; light/dark; layout retained across mode switches | DIRECTION-APPROVED |
| UX-011 | Inspector always consumes area | Open-on-selection sliding drawer, closable | DIRECTION-APPROVED |
| UX-012 | More realistic training content | Multiple workspaces with representative example counts; source data excluded from public GitHub | DIRECTION-APPROVED |

## B. v0.6 requirements from prior feedback

| ID | Owner feedback | Check to run on prototype | Status |
|---|---|---|---|
| UX-013 | Inspector sometimes did not open in v0.5 | Click vs drag vs edge handle do not conflict; inspector opens reliably | PROTOTYPE-CLAIMED |
| UX-014 | Collapsed lane had awkward reopen button | Reopen from visible top header; new icon | PROTOTYPE-CLAIMED |
| UX-015 | Snap card width follows lane width | Resize lane by divider, Cards expand/contract | PROTOTYPE-CLAIMED |
| UX-016 | Glow did not follow selection | Highlight always transfers and old glow clears | PROTOTYPE-CLAIMED |
| UX-017 | Default View button | Restore viewing settings only, not data | PROTOTYPE-CLAIMED |
| UX-018 | Status-colored Action Cards | Completed green, Blocked gray, Canceled red, other two distinguishable | PROTOTYPE-CLAIMED |
| UX-019 | Side note renamed from Content | Inspector and Hover; not on Canvas; remains searchable/exportable | PROTOTYPE-CLAIMED |
| UX-020 | Add Node from lane Header | '+' on the relevant lane | PROTOTYPE-CLAIMED |
| UX-021 | Remove duplicate Title in Inspector | One editable title, no redundant repeated large heading | PROTOTYPE-CLAIMED |
| UX-022 | Free Float neon background | No static lanes; colored blended zones | PROTOTYPE-CLAIMED |
| UX-023 | Auto Arrange and Undo | Works both modes; avoid overlapping cards/lines where feasible | PROTOTYPE-CLAIMED |
| UX-024 | Add demo workspace switching | Multiple independent synthetic workspaces | PROTOTYPE-CLAIMED |
| UX-025 | Improve app animation | Selection, drawer, layout, mode changes | PROTOTYPE-CLAIMED |
| UX-026 | Resize Card in Free Float | Width and height resize, separate from drag/connect | PROTOTYPE-CLAIMED |

## C. New v0.7 feedback — pending implementation, owner-requested

| ID | Owner request | Acceptance / verification | Status |
|---|---|---|---|
| V07-01 | Connect >=80% of demo Nodes coherently | For every demo workspace: linked-node coverage = nodes with >=1 edge / total nodes >=80%; edge types are visibly flagged illustrative, no invented confirmed causality | OPEN |
| V07-02 | Remove Glass control | Glass toggle not in top/header; fine visual finish remains | OPEN |
| V07-03 | Workspace selector only, no duplicate case selector | One selector names currently displayed PDCA Workspace; Problem Node category retained | OPEN |
| V07-04 | Strong per-Node neon blend in BOTH themes | Every Node has distinct glow/ambient colored light; overlaps blend visibly in light and dark | OPEN |
| V07-05 | Card sizes respond to text | Minimum height/area for two-line title; no excess blank space unless manually resized | OPEN |
| V07-06 | Inspector transition more polished | Smooth slide/fade on open/close without missed clicks or focus jumps; reduced-motion fallback | OPEN |
| V07-07 | After New Node, animated pan to node | New Node in viewport, visibly selected; no data loss if motion interrupted | OPEN |
| V07-08 | Lines solid, remove all arrowheads | Solid curves end only on left/right dots, no Card-edge mid/top/bottom connectors; direction retained in data/Inspector | OPEN |
| V07-09 | Auto-hide upper Header on downscroll | Header slides away on downward canvas scroll and returns on upward scroll; accessible toolbar | OPEN |
| V07-10 | Auto Arrange avoids crossing Cards | Card-aware route geometry with visible test; accept line-line overlap; Undo available; note unavoidable complex cases | OPEN |
| V07-11 | Preserve original approved features | Category plus/collapse/resize, status colors, text size, Action 20:80, default view, Snap/free resize, multi-workspace mocks | OPEN |

## D. Risk register for DESIGN verification

| Risk | Why it matters | Treatment |
|---|---|---|
| R-UX-01: Drag/click interaction conflict | Selection, resize, scroll and links can compete on pointer events | Explicit gesture thresholds; browser-based regression tests |
| R-UX-02: Edges through Cards | Auto Arrange may improve crossing count while obscuring content | Collision checks and obstacle-aware routing, undo/diagnostic warning |
| R-UX-03: Dense workspace performance | 186 synthetic sample Nodes and ~200-Node test graph can overload glow/SVG routing | Cache layout, throttle drag/reroute, respect reduced motion, profile Chrome |
| R-UX-04: Category/visual semantics drift | Free Float needs category recognition without static lanes | Use per-Node colors and clear inspector labels; retain full seven-category model |
| R-UX-05: Directed edge semantics hidden without arrows | Visual line alone may not convey source/target | Reveal Source/Target in hover or Inspector and accessible labels |
| R-UX-06: Sensitive demo content in public repo | Original v0.6 derived from internal working Excel | Commit only sanitized synthetic HTML and redact person/operations |
| R-UX-07: Visual prototype mistaken for working software | Offline mock cannot validate real-time editing, access, audit, recovery | Mark mock status clearly; BUILD and production tests gated |

## E. Suggested v0.7 validation sequence

- [ ] First: instrument gesture selection, Inspector and glow; fix regression from v0.5.
- [ ] Next: 80% linked coverage for each fully synthetic case, verify no double links/self links and no fabricated confirmed relationships.
- [ ] Next: mode switching; column collapse/expand, lane resizing, Free Float card resizing and safe Default View.
- [ ] Next: robust solid edge rendering and auto-arrange/card-collision test.
- [ ] Next: one Workspace selector, new Node pan/selection and animated drawer.
- [ ] Last: neon blending and animation polish, performance checks in both themes at 1920×1080.
- [ ] Record screenshots/video, interaction test results, defects and owner acceptance before freezing baseline.

**Current state:** v0.6 public-safe snapshot CHECKPOINT; v0.7 requirements captured, **not implemented or verified**. No final UI/UX acceptance; no BUILD authorization.
