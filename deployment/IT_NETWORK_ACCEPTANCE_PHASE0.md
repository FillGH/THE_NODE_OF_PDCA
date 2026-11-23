# Phase 0 — PDCA Factory LAN / IT Network Acceptance Matrix

**Status: PROPOSED CHECKLIST / ALL FACTORY TESTS NOT TESTED.**
**Companion:** [ADR-001 Private-IP LAN Transport](../design/architecture/ADR-001-private-ip-lan-transport.md).
**Project authority:** `PROJECT.md`; Factory LAN verification `design/PILOT_VERIFY.md` V-01–V-08. No one is assigned a named PIC/date by this file.

Use one evidence record **per actual Host / configuration / target audience**. The results of Float Monitor do not substitute for PDCA results. For each gate record **TESTED / PASS / FAIL / BLOCKED / NOT TESTED**, date, Host identifier, environment, code/package SHA, network point, tester role, evidence path/checksum and verifier signoff. The default below is NOT TESTED.

| ID / Scope | IT verifies / controls | Required evidence (example; not claimed) | STOP / NO-GO | Status |
|---|---|---|---|---|
| IT-N01 — authorized Host | Temporary Laptop and later Dedicated Windows Host approved by IT; service account, disk and startup/locked/sleep behavior; no unapproved binaries; device security baseline | Host inventory, OS/Node approved versions, IT change ticket, authorized service account and endpoint security checklist | Host not approved, endpoint protection disabled, or unapproved software | NOT TESTED |
| IT-N02 — private IP and port | Actual private NIC IP, DHCP reservation/change process, approved ingress Port, no collision with Float Monitor or other services | `ipconfig`/IT IPAM proof, Host bind/port evidence, approved Port inventory and local + remote connectivity | Wrong NIC, public/wildcard bind without authorization, unexpected exposed ports | NOT TESTED |
| IT-N03 — segmentation / firewall | Only approved factory subnets/clients reach the intended ingress; deny guest, Internet, VPN, other disallowed LANs; direct Node port/SQLite/SMB not exposed | Scoped Windows/Network Firewall ACL export, allowed+denied client test logs, perimeter/routing result, no direct backend access | Unauthorized LAN device passes, Internet/VPN path passes, direct backend reachable | NOT TESTED |
| IT-N04 — HTTPS IP certificate (B) | Valid server cert with exact `iPAddress subjectAltName` for literal IPv4; appropriate private key ACL and CA chain trusted by approved Edge clients; expiry/rotation/IP change process | Certificate details and SAN, issuing CA trust result on multiple clients, expired/wrong-IP/untrusted-certificate negative tests; no bypass | TLS warning override, wrong IP SAN, untrusted certificate, unsupported renewal | NOT TESTED |
| IT-N05 — identity/device authorization (B) | Auth at proxy independent of self-declared display name and subnet alone; if mTLS, issue/enroll certs to approved clients and **prove revocation/deprovisioning**, not only CA validation | Allowed/denied/revoked client identity logs, effective revocation verification, enrollment/permission change record | Revoked/non-authorized client still accesses UI/API | NOT TESTED |
| IT-N06 — proxy header and session integrity (B) | Preserve external `Host` / `Origin`, forward `Authorization: Bearer`, strip client-supplied ingress/operator headers and inject IT-owned ingress only; no Basic Auth header overwrite | Safe header-spoof/invalid-origin requests, anonymous and normal session requests, proxy access logs, separate IT Operator CLI checks | Spoofed operator/header accepted, session broken or unauthorized API allowed | NOT TESTED |
| IT-N07 — HTTP exception (A ONLY) | For a **fictional-data dry run only**, explicitly record acceptance of cleartext payload + Bearer Session, source-scoped IT Firewall/ACL, bounded time and revert plan | Written IT security exception, network scope, no real records, expiry/closure and evidence of allow+deny; software HTTP regression is separate | No formal exception, personal/factory data present, broad/unknown network access | NOT TESTED |
| IT-N08 — Host/Client browser checks | Owner Laptop operates as Host **and** Edge client on the same public URL; at least one authorized additional PC opens that URL (two or more remote PCs preferred); no manual static client IP config | Browser URL/Edge version and screenshots without sensitive data, create/edit/link/auto-save, refresh/restart, separate sessions and exports | Cannot access same saved dataset or a core task fails | NOT TESTED |
| IT-N09 — DB authority and NTFS | Local Host disk for Workspace/Audit/Witness, `PDCA_ACTIVE_DB_POINTER` under `PDCA_DATA_ROOT`, backup/restore staging and Operations Log with correct IT-only ACL; no shared SMB/UNC live SQLite | Redacted path tree/ACL record, selected Active Pointer and Workspace/Audit Witness validation, cold/warm restart comparison | Wrong active pair, audit mismatch, DB outside trusted root, broad file ACL | NOT TESTED |
| IT-N10 — host-stopped Recovery exclusivity | Before ADOPT / MIGRATE-LEGACY / ACTIVATE / ROLLBACK (actions gated by `withStoppedServer()`), verify **all** server listeners genuinely stopped; staged PREPARE and Restore remain subject to their separate existing controls; especially if Direct HTTP bind changes from loopback | Cross-process held-port tests on actual host IP and loopback, forced-running-server negative operator test and safe recovery logs | Recovery can modify/activate while PDCA Host is serving | NOT TESTED |
| IT-N11 — backups and disaster boundary | Backup completeness and restoration of Nodes/Links/Images/History/Audit; RPO ≤4h and RTO ≤1 working day **for scenarios with surviving valid backup and infrastructure**; off-host strategy separate if required by IT | Timed drill, hash/cutoff/witness inventory, pointer/recovery log, capacity/storage/retention monitoring | Silent loss, unverified restore, unauthorized pointer edits, unmet recovery gate | NOT TESTED |
| IT-N12 — concurrency / F-07 | ~200 nodes and ~10 simultaneous authorized editors without silent overwrite; measure save operations, exports and F-07 IT Status under representative writes | V-05 event log, latency/lock/error counts, Writer-vs-Status evidence with fixed environment/versions, user-visible conflicts | Silent overwrite; unresolved critical data safety issue; unreviewed `SQLITE_BUSY` treated as success | NOT TESTED |
| IT-N13 — package and cost/license | One verified package and code SHA across both environments; Node version, dependency licenses, IT-owned proxy approval and no-new-spend constraint | ZIP manifest/checksum, dependency/license review, IT software inventory, planned rollback and version tag | Checksum/version mismatch, unapproved dependency, undocumented new cost | NOT TESTED |
| IT-N14 — operations, segregation and owner GO | Primary+alternate administrator, IT/InfoSec access acceptance, Project Owner go/no-go, incident/rollback operator and evidence retention | Named roles recorded by company (not invented here), separate IT and Owner signoff, change/rollback record | Missing obligatory approvals, unowned recovery, data exposure or critical test failure | NOT TESTED |

## Decision gates

1. **Phase 0 Architecture GO:** Owner chooses A/B/HOLD and signs ADR; IT accepts the *proposed transport/security pattern* in principle, including exception bounds if choosing HTTP. This **does not** pass IT-N01–N14 or authorize production.
2. **Phase 1–3 Coding GO:** Explicit owner authorization after ADR approval and scoped implementation plan. CI and code review are necessary but **not** Factory acceptance.
3. **Synthetic LAN GO:** IT-N01–N07 as applicable must be ready with negative security tests before any multi-client connection on the factory network. Only synthetic data before separate real-data authority.
4. **Official Pilot / Real-data GO:** All in-scope V-01–V-08, G-04/05/07/09/10/11/12 and other mandatory functional/usability gates PASS with documented IT/Security and Project Owner acceptance. F-07 remains open until target workload evidence supports closure.
5. **NO-GO override:** Failed, missing or untested mandatory controls do not become PASS through a verbal signoff. Stop LAN ingress and use controlled rollback on unintended access or data-integrity failure.

## Proposed evidence record template

`Host/Environment: ___ | Source SHA / Package SHA-256: ___ | IP/Port/URL: ___ | IT-tested segment: ___ | Test ID: ___ | Date/time: ___ | Allowed/Denied expected: ___ | Actual status: ___ | Observed result: ___ | Log/evidence location: ___ | IT verifier: ___ | Owner decision: ___`

No secrets (keys, tokens, private certificates), employee personal records, internal exact subnet maps or private server addresses should be committed to the public repository; retain controlled internal evidence under IT policy.

## Clarifications for IT before Phase 1–3

- Is **HTTPS over literal private IPv4** support available from IT CA and policy, or is an internal DNS name mandatory?
- Is certificate-based client authorization/mTLS feasible on approved Edge endpoints and what proves revocation; or should an existing IT-approved access-aware Proxy be used?
- What private IP/port will the Laptop/Server have; which client network ranges are allowed and denied; will network rules be documented for each?
- Does a time-limited, fictional-data-only Direct HTTP test meet policy, and who must approve that exception (if considered)?
- Are operation/backup responsibilities and any Float Monitor coexistence constraints confirmed independently for PDCA?

**Current factory status:** IT-N01–IT-N14 **NOT TESTED / NOT APPROVED**. This template is not evidence of completed controls.
