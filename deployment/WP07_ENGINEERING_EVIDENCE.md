# WP-07 engineering evidence register — Gate II pending

Owner authorization and F-10 closure: PROJECT.md; WP-07 only. No WP-08/09, release, merge, deploy, Factory or real-data authorization.

## Completed evidence — 9d8d66c / run 45331660731 (attempt 1)
- [Run](https://github.com/FillGH/THE_NODE_OF_PDCA/actions/runs/45331660731): 4/4 success. All three fresh Windows jobs 60/60 source and 27/27 staged (12 Direct, 15 Recovery); no failures/skips. 6,910 manifest files; preflight/setup/seed/repeat guards/ADOPT/actual Edge/ACL 3/3. Extended Edge exercised node/edge edit, UUID, duplicate UI guard, document/image, history, Trash restore, actual downloads (PDF/XLSX signature, JSON saved content), remote admin denial, session end, abrupt restart/IT Status and persistence.
- [F-07](https://github.com/FillGH/THE_NODE_OF_PDCA/actions/runs/45331660731/job/138234056096): fixed synthetic 200 nodes, 10 independent HTTP sessions, 200 confirmed edits each scenario. Baseline 12650 ms, p95 edit cycle 747 ms; contended 12394 ms, p95 692 ms; final revision 201 and all node values checked, final managed integrity PASS both. Status 42/42, 0 BUSY/other; nearest-rank p95 612 ms, median 143.5 ms, max 651 ms. One sequential paired run, no causal speedup inference or long-term/Factory reliability claim. F-07 mitigated; Factory measurement OPEN.

## Gate II coverage and outstanding checks
| Requirement | Evidence / disposition |
|---|---|
| Assigned RFC1918, no wildcard/public/unassigned bind, strict origin, fail-closed ports, loopback | DIRECT-01, 06, 07, 12; R-01; fresh installation; raw Host/cross-site/unauthenticated API additional verification pending |
| Local-only admin / no remote audit/restore | DIRECT-06, 09; R-04; extended Edge admin UI and HTTP with/without correct synthetic IT key PASS |
| Actual Edge session, nodes/edges, UUID, duplicate prevention, autosave, image/document, history/trash/export/restart | Extended Edge 3/3 PASS; semantic/typed exports H/O/E regression; Action Overview unit regression |
| Cross-tab/peer collaboration, draft reconnect | C-01–C-07, C-09–C-11, E-02/E-04, autosave tests and representative ten-editor HTTP workload PASS at server/test level. Added actual sibling Edge tab, independent session conflict, failed PUT, offline/reconnect, explicit review + once-only commit, peer session termination. New run pending. Same-host tests do not prove Factory multi-PC, full browser crash/restore-tab and all fault interleavings. Record limits separately. |
| Shared managed exclusion / process termination | DIRECT-03/04/05/09/10/11/12, R-01/04/10/12; independent process lease and abrupt staged Host restart. Legacy processes must be stopped by IT. |
| Recovery, tamper/witness/legacy data/rollback | R-01–15, B4-01–09, source/staged tests; actual Windows staged Status/restart. |
| Setup/paths and package | DIRECT-07/08/10/11/12, R-01/14; repeat config unchanged, seed guard/hash, final ACL, staged manifest and runtime BAT. npm only CI build; actual independently extracted ZIP/offline registry target verification reserved WP-08 (not started). |
| IT security / actual LAN, real data, RPO/RTO, Factory F-07 | NOT TESTED; Gate III/IV; no claim of approval. |

## Change review
This increment adds CI/test evidence only, not runtime/schema/security/recovery changes. Confirm exact diff and new run results before recommendation. Endpoint preflight is point-in-time and does not eliminate race; keep independent ADOPT guard and IT approved endpoint. HTTP remains cleartext, display name not authentication; IT admission and data scope are independent. Historical EACCES OS mechanism unconfirmed. No new release artifact. Gate II HOLD until verification results and remaining scope reviewed with owner.
