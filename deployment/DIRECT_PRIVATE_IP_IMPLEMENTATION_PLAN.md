# Direct Private-IP LAN — Implementation Plan

**Status: WP-01–09 OWNER ACCEPTED / CLOSED IN ENGINEERING AND WINDOWS CI CANDIDATE SCOPE; GATE III/IV / RELEASE / MERGE / DEPLOY / REAL DATA / PILOT HOLD.** Date 2026-11-24. Owner explicitly approved ADR-001 rev2 and WP-02–06 with regression tests on 24 November 2026. ADR-001 revision 2 selects Direct HTTP/no proxy as planning direction. Runtime baseline `428885c44dda6aef7dd0bfbc8bd9cce13922388f`. Draft PR #1 remains untouched; planning-only PR #2. No time, budget or named IT assignee is assumed.

## 1. Definition of Done

Deliver one verified Windows ZIP for Laptop Host+Client and Dedicated IT Server, minimal IT config, setup/start/diagnose BAT workflow, no proxy/Caddy/certificate/DNS/client static-IP setup required, no npm/Registry/package fetch on either target Host. Preserve Node 24.11.0 runtime baseline, dependencies bundled by CI, PDCA functionality and managed data recovery. Laptop test uses synthetic records; server test and deployment permissions remain distinct. A software-verified ZIP is not a Factory PASS.

## 2. Proposed IT interface

Example only; not real infrastructure:

~~~dotenv
PDCA_BIND_HOST=192.168.1.50
PDCA_PORT=4175
PDCA_DATA_ROOT=D:\PDCA\data
~~~

Use existing PDCA_* keys, exact derived HTTP origin, stable conventional paths and local secrets in IT-owned configuration outside ZIP. The three inputs are a design target, not an implemented contract. Setup must validate/preview resolved config, generate necessary distinct operator keys securely on first setup, never echo them, never regenerate existing ones implicitly, and refuse conflicting/ambiguous existing config. Existing explicit paths/active pointer remain authoritative and compatible. Local development remains loopback-only unless a concrete assigned private IPv4 is intentionally configured. IT selects the actual IP/port/root. No per-client changes.

## 3. Work packages and dependencies

| WP | Scope / deliverable | Dependency / acceptance |
|---|---|---|
| WP-01 — Phase 0 | Revised ADR, plan, IT matrix, project decision record | Documentation prepared; direction recorded, BUILD HOLD |
| WP-02 — Phase 1 | Centralized bind/origin/port resolution; explicit local versus direct mode; exact RFC1918 assigned NIC validation; strict Host/Origin, reject unsafe cross-origin/forwarded/privileged headers; direct mode no proxy ingress dependency | Owner BUILD GO; code review; unauthorized/invalid config fails closed |
| WP-03 — Phase 2 | Shared cryptographically generated UUID v4 helper using randomUUID where present or getRandomValues fallback with proper UUID version/variant; audit all browser secure-context dependencies; no Math.random | WP-02 integration; validate all ID call sites, format, real Edge at HTTP/private IPv4 (not localhost or flags relaxing browser security) |
| WP-04 — Phase 1/3 critical | Replace fragile loopback-only stopped-host proof with shared host/maintenance exclusivity tied to authoritative canonical data identity. Design before enabling direct bind. Maintain fixed-port validation as appropriate; prevent overlapping Host/ADOPT/MIGRATE-LEGACY/ACTIVATE/ROLLBACK across changed IP/port, process race and restarts; fail closed on stale/ambiguous lock or errors. Avoid introducing unsafe lock bypass. | WP-02 must NOT ship without WP-04; independent review and deterministic two-process tests, same data on different interface/port; both start-during-maintenance and maintenance-during-start refused |
| WP-05 — Phase 3 | Minimal config normalization shared by Host, CLI, recovery, preflight and backup; derive paths without changing existing authority; protect against wrong-root, traversal, symlink/junction escape, missing/stale active pair and accidental initialization; retain managed mode for both environments | WP-04; non-destructive config/legacy compatibility, explicit migration/recovery evidence |
| WP-06 — Phase 3 | Setup/Start/Diagnose BAT launchers and local recovery menu; Setup verifies package/runtime and proposes data paths; no npm call, network download, admin privilege escalation, firewall modification, automatic data migration or overwriting existing DB; Diagnose read-only, reports effective bind/root/active-pair status without secrets; Start blocks invalid state | WP-02–05; Windows clean-run and negative tests; documented exit codes and safe stop |
| WP-07 — Phase 4 | Regression / security / actual Edge / recovery tests, including remote privilege denial; measure F-07 under fixed representative workload and document residual limitations | WP-02–06; automated PASS before candidate release; Factory tests separate |
| WP-08 — Phase 5 | Verified prebuilt package built via CI npm dependency installation + locked versions; independent Windows target verification without npm invocation or registry; exact SHA and manifest, no secrets and no real data | WP-07; SHA-256 verified and smoke evidence from clean runner |
| WP-09 — Phase 5 | README4IT concise setup guide, LAN test and server migration/rollback guide; remove proxy from new default workflow, retain previous baseline in history; record CI vs Factory evidence | WP-08; handover with IT matrix and actual factory acceptance still open |

Proposed file impact: `src/server.js`, `src/ops.js`, `src/active-db.js`, web session/canvas/workspaces and shared UUID module, demo bootstrap, Windows launch/diagnose/recovery tooling, regression tests, packaging workflow/manifest and deployment documentation. Exact file list comes from review. No unrelated features or database schema/journal changes. Do not mix F-07 remediation into transport changes unless independently justified and approved.

## 4. Engineering gates

### Gate I — Phase 1–3 implementation authorization

Separate Owner instruction naming this plan; record IT-reported deployment authorization accurately and outstanding factory evidence. Preserve baseline code SHA and rollback package. Implementation branch based on reconciled current source (not silently changing PR #1). No automatic merge. New source changes require review.

### Gate II — local engineering acceptance

- Bind correct assigned RFC1918 only; reject missing/ambiguous/wildcard/public/unassigned IP, port conflict, unexpected Host/Origin, cross-origin requests and forged privileged headers. Local-only mode remains functional. No implicit auth bypass due to empty origin. Keep all LAN administrative/recovery/audit privileges local via controlled CLI, and deny remote operator-key headers even if valid. Verify both unauthorized UI and API behavior where app controls apply; actual network ACL remains IT's responsibility.
- Actual private-IP HTTP Edge: session lifecycle, new/edited Nodes and edges, UUID generation, duplicate prevention, auto-save, graph revisions, cross-tab/peer collaboration, image/attachment handling, history/trash, export PDF/Excel/JSON, restart/reconnect. Test data and session values only. No disabling browser security.
- Shared exclusion: processes with same managed dataset but distinct IP/port cannot write concurrently or activate during serving. Hold lock through startup/shutdown and maintenance; prove no check-then-act gap; fail closed for stale/ambiguous lock; test Windows process termination and legitimate stopped-host recovery. No weaker witness checks.
- Existing full automated regression, 15 recovery tests as applicable to baseline, deterministic contention tests and newly added cases; verify counts from actual output, not assumed. Test clean Windows package start/seed/restart/recovery without npm command/network package fetch; distinguish bundled Node/npm installation from no npm invocation. Verify package checksum and all manifest files. Preserve prior verified release.
- Test configuration derivation, first setup and repeat setup, invalid root/alias, existing Active Pointer selection and legacy explicit paths. No unexpected empty DB creation or overwrite.

### Gate III — Factory LAN synthetic test (IT-controlled)

Apply IT-approved scope first. Same Host URL from laptop browser and at least one authorized peer PC, preferably more; confirm denied unapproved clients and guest/VPN/Internet routes using IT evidence (not timeout alone). Review HTTP risk/actual endpoint controls, administrative-route denials, Host IP stability, firewall and Local NTFS/ACL. Use V-01–V-08. Test ~200 Nodes and ~10 concurrent editors, no silent loss, measured F-07 status outcomes/write cost; retain RPO ≤4 h and RTO ≤1 working day under the confirmed recovery conditions. Record NOT TESTED if actual evidence absent.

### Gate IV — Dedicated Server / Pilot

Use same artifact SHA; different external config and independent dataset/credentials. For transfer, stop/disable source Host, preserve verified Workspace/Audit/backup and active state, use approved migration/recovery (do not copy absolute-pointer JSON blindly), validate target authority, witness, counts/IDs/attachments/history and restart, prevent two writable hosts. Record source/target evidence and rollback plan. Real-data use and Pilot require appropriate separate IT/data permission; all existing mandatory hard gates and pilot usability thresholds remain. Owner decides GO after evidence. No fabricated approval ID/flag.

## 5. Stop and rollback

Stop if network scope unverified or changed, unauthorized client accepted, remote operator path accessible, cleartext risk not accepted for intended data, browser compatibility fails, exclusivity can be bypassed, wrong data pair, integrity/recovery regression, or required approval/evidence absent. Block ingress via IT controls; stop new writes and preserve latest data/evidence using approved procedure. Restore prior validated runtime only after compatibility and data-state checks; no blind overwrite of live files or active pointer. Preserve current HTTPS baseline as historical rollback/reference, not an additional runtime prerequisite.

## 6. Authorization record (issued)

Owner command: "อนุมัติ ADR-001 revision 2 และแผน Direct Private-IP LAN ให้เริ่ม Implementation Phase 1–3 ตาม WP-02 ถึง WP-06 โดยรักษา Recovery exclusivity และ Data Integrity; ห้าม Merge/Deploy หรือใช้ข้อมูลจริงจนกว่าจะผ่าน Gate ที่กำหนด"

**Disposition: WP-01 PREPARED; WP-02–06 AUTHORIZED / CANDIDATE IMPLEMENTATION; WP-07–09 HOLD except regression checks authorized within WP-02–06.** Verification results must be recorded separately. No Factory LAN configuration, deployment or acceptance is claimed.

### WP-07 authorization (24 November 2026)

Owner accepted F-10 (CI 45330657130, 3/3 fresh installs, 8/8 criteria) and approved WP-07 only. Gate II is not yet accepted. Reuse previous evidence only where the implementation is unchanged and the check maps to the requirement. Keep F-07 synthetic and Factory evidence separate. WP-08/09, Release, Merge, Deploy and real data/Pilot remain HOLD. Historical EACCES OS cause not established; retain bind/lease guards.

WP-07 evidence is tracked in [WP07_ENGINEERING_EVIDENCE.md](WP07_ENGINEERING_EVIDENCE.md). Gate II remains pending; no later work package is authorized.

### WP-08 authorization (24 November 2026)

Owner accepted WP-07 local candidate engineering at `7666598bceb170932f4d5b5abc6e1a71c868c8f8` ([run 45332235054](https://github.com/FillGH/THE_NODE_OF_PDCA/actions/runs/45332235054)), deferring final package acceptance to WP-08. Package the pinned accepted source, not the subsequent CI/documentation commit. Independent runner receives archive/checksum and separate QA harness from same source, no repository checkout, exact Node 24.11.0; isolate node.exe from npm/npx and caches, no npm/registry commands, synthetic data outside archive, verify hash, manifest, Direct/Recovery tests, documented Setup/Seed/ADOPT/Diagnose/Start/Edge/restart and ACL. Candidate only; no release/merge/deploy/real data. WP-09 handover and IT-facing documentation reconciliation remain HOLD.

### WP-09 authorization (24 November 2026)

Owner accepted WP-08 10/10 (6/6 jobs), Gate II CI package scope, and approved IT handover preparation only. README4IT is the active entry, Direct operator guide covers backup, migration, recovery and rollback. Old proxy kit historical. New docs change archive content; WP-09 candidate must be built from exact new commit with unchanged runtime relative to 7666598, new inner ZIP SHA-256, manifest and independent clean-target E2E. Retain prior verified artifact identity separately. No Factory deploy, real data, release, merge, actual IT handover or Pilot authorization. Gate III/IV NOT TESTED.

### WP-09 documentation correction (24 November 2026)

Owner approved D01/D02 documentation-only increment after prior review 8/10, CI 6/6. Reconcile legacy source precondition, planned cutover ordering and historical checkout/launcher references. New archive identity requires new Build + Independent Clean Target and parallel regression. No runtime changes; WP-09 not closed until review. All subsequent gates HOLD.
### Owner acceptance and freeze (24 November 2026)

WP09-D01/D02 CLOSED; WP-09 10/10 accepted; all nine implementation WPs CLOSED in engineering/Windows CI candidate scope. [PROJECT.md](../PROJECT.md) records the current Owner decision, full frozen source and inner ZIP identity, verification evidence and holds. Frozen candidate `a109423103732a905edee228e7caa5fdb3e1fbf6`; inner ZIP SHA-256 `dd2f9ee800b002c33d3726d7e855de2458868e2209f6527503c9dec74dc6e045`; CI 45345202050 and 45345202114 attempt 1, 6/6 jobs. Later Project Record commit is not packaged source; no rebuild or release authorized. Gate III/IV, Merge, Final Release, Factory Deploy, real data and Official Pilot remain HOLD; IT distribution and Factory acceptance not performed. F-07 mitigated/open Factory. Preserve the verified ZIP and checksum before expiry; no claim of actual preservation.
