# DESIGN v0.10 acceptance evidence · THE NODE OF PDCA

The Project Owner accepted the scoped core UI/UX interaction baseline on 2026-11-08. The reference is [the offline DESIGN v0.10 prototype](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/684bc5006f6dd60f717a3c755da7f68bfe63f430/design/prototypes/DESIGN_v0.10.html), verified against the local prototype (Git blob `ad7ebd16a29cdfa7b2e1fd6c833cd0c805967d3c`). All cases and measurements here used synthetic data.

| Check | Owner-reported outcome |
|---|---|
| B1 | Passed: create/edit/link Nodes and open an illustration in the 20-Node demo. |
| B2 | Passed: per-Workspace Actions, status filters and percentage summaries. |
| B3 | Passed: follow a Result back to the Problem, switch Snap/Free Float, Auto Arrange and Undo in the 50-Node demo. |
| B4 | Passed: Canvas pan/zoom and Mini-map navigation. |
| B5 | Passed: Inspector placement and Snap header behavior on tab changes. |
| S1 | Passed: the owner was satisfied with responsiveness and edge readability in the synthetic 200-Node exercise. Timing results exist for both modes. |

For B1–B5, the owner reported the combined result after using the prototype. Independent simulated-DOM checks supported the interaction logic. S1 used a separate QA copy with 200 Nodes and 273 links. The owner captured three runs per mode in Edge 156.0.0.0 on Windows, 1920 × 1080 display, 1912 × 914 viewport, DPR 1, Reduce Motion enabled.

| Mode | Reopen, median to second frame | Auto Arrange, median to second frame |
|---|---:|---:|
| Snap | 83.9 ms | 76.5 ms |
| Free Float | 94.5 ms | 111.4 ms |

These timings describe the measured machine and reopening the graph in an existing tab. They are prototype evidence, not Pilot performance thresholds or a concurrency test.

The accepted scope covers Node create/edit/link interactions, reasoning trace, Canvas/Inspector/Mini-map, Snap/Free Float with Auto Arrange/Undo, and per-Workspace Action Overview presentation, statuses, counts, percentages and filtering. The all-Workspaces view is a demo convenience outside D-092. The demo's forward-category link restriction and arrowless rendering do not replace D-060/D-105. Save and reconnect states, Node locks and drafts, History/Trash, backup/restore, and Host and access controls with IT remain open DESIGN work. BUILD requires separate approval.
