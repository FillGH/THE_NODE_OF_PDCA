# ADR-001 — Private-IP LAN Transport for Laptop and Dedicated Server

| Metadata | Value |
|---|---|
| Status | **PROPOSED — Architecture decision and Phase 1–3 authorization NOT APPROVED** |
| Created | 2026-11-24 (Asia/Bangkok) |
| Owner/decision authority | Project Owner for product/architecture direction; separate company IT/security authority for network, information security, and infrastructure |
| Project authority | `PROJECT.md` (D-014, D-017–D-019, D-032, D-058, D-065–D-071; G-04/05/07/08/09/10/11/12) |
| Evaluated source | PDCA `428885c44dda6aef7dd0bfbc8bd9cce13922388f`, Draft PR #1 unmerged; Float Monitor V1.5 `a12bb73f389ae734b663426cd23b2d643c3866af` |
| Scope | Phase 0 decision analysis **only** — no application changes, no live host/network changes, no data migration, no Pilot/Production GO |
| Companion | `deployment/IT_NETWORK_ACCEPTANCE_PHASE0.md` |

## 1. Decision question

How can **one PDCA codebase and one verified Windows package** support:

- **Environment A — Windows laptop:** owner's laptop is simultaneously the sole writable Node.js/SQLite Host and an Edge Client; authorized colleagues use the same URL from factory PCs.
- **Environment B — IT-managed dedicated Windows Server:** the same application package with separate environment config, data paths, credentials and network ingress.

The owner wants a URL using **the Host's private IP**, not manual static IP configuration on every PC. Direct HTTP (`http://<HOST_PRIVATE_IP>:<PORT>`) is an option to evaluate, **not** an already approved requirement for real PDCA records. HTTPS with an IP literal (`https://<HOST_PRIVATE_IP>[:PORT]`) also meets the no-per-PC-configuration goal. The Host IP must remain stable through DHCP reservation/static IT host assignment or be updated through a controlled change procedure.

## 2. Established evidence and limitations

**PDCA source facts**
1. `src/server.js` binds Node HTTP only to `127.0.0.1:PDCA_PORT`. `src/ops.js` currently requires `PDCA_ORIGIN` to be a matching **HTTPS origin** with `PDCA_INGRESS_KEY`. The app checks browser `Host`/`Origin` and an ingress header, while its browser session sends `Authorization: Bearer` (not an app Session Cookie). `web/session.js`, `web/canvas.js` and `web/workspaces.js` use browser `crypto.randomUUID()` directly.
2. The existing verified Draft PR includes a same-laptop HTTPS/mTLS reverse-proxy template. It is **prepared and CI-tested, not factory tested**. Its template uses `__PDCA_FQDN__` and `verify-client.ps1` assumes DNS resolution; both need **IP-literal compatibility testing / possible script update** before claiming `https://<IP>` support. Backend business logic may not need changes for HTTPS-over-IP if the proxy preserves headers.
3. `src/active-db.js` `withStoppedServer()` currently reserves `127.0.0.1:PDCA_PORT` to prove the Host has stopped before ADOPT/ACTIVATE/ROLLBACK. **If the app is re-bound to a different private IP, this existing check might not detect a running service on that interface.** This is a potential data-integrity regression and an explicit BLOCKER for an unreviewed Direct HTTP bind change.
4. Managed Mode uses `PDCA_DB`, `PDCA_AUDIT`, `PDCA_DATA_ROOT`, `PDCA_ACTIVE_DB_POINTER`, `PDCA_BACKUP_DIR`, `PDCA_RESTORE_DIR`, `PDCA_OPS_LOG`, `PDCA_PORT`. The Active DB Pointer, Workspace/Audit pairing and witness checks are authoritative; inventing `DB_PATH` aliases or bypassing the pointer risks opening an unintended database. No app cookie `Secure` flag was found in the reviewed session path.
5. Current F-07 IT Status contention is **MITIGATED / OPEN**; CI evidence does not close representative Factory Load/Writer-cost verification.

**Float Monitor source facts**
1. Float Monitor V1.5 binds **a concrete RFC1918 host IPv4** (not `0.0.0.0`), uses **Direct HTTP** within IT-approved network boundaries, and explicitly documents no application login/TLS/per-user identity. Its access-risk acceptance does **not** transfer automatically to PDCA.
2. Float Monitor's frontend intentionally falls back from `crypto.randomUUID` to `crypto.getRandomValues` for HTTP request IDs; PDCA has no equivalent fallback today.
3. Float Monitor's former fictitious approval-reference config flags were removed. Their existence in Float Monitor's history is **not evidence** those flags exist in current PDCA code; distinguish runtime flags from separately documented approval obligations.

**External standards**
- MDN: `crypto.randomUUID` is Secure-Context-only; `crypto.getRandomValues` is available in insecure contexts.
- RFC 9110 `4.3.4` / RFC 5280 `4.2.1.6`: for `https://<IP>`, validate the server's **IP identity** and certificate **iPAddress subjectAltName**. A DNS-name-only certificate does not prove that numeric IP.
- OWASP Session Management: TLS must protect the complete Session exchange (including session tokens in HTTP headers), not just initial login.
- Caddy supports TLS client-auth `require_and_verify` with an IT-managed trust pool; **CA verification alone is not proof that de-provisioning/revocation takes effect immediately**. IT must demonstrate the actual revocation mechanism.

See ``9. References` for exact source links. Source-derived conclusions are not Factory Network Test results.

## 3. Options assessed

| Criterion | A — Direct HTTP on private host IP | B — HTTPS-over-IP via IT-managed reverse proxy |
|---|---|---|
| User URL | `http://<IP>:<PORT>` | `https://<IP>[:PORT]` |
| One Laptop as Host + Client | Yes, **after app and Recovery changes** | Yes, same HTTPS URL on Host and all approved PCs |
| One Codebase, Laptop → IT Server | Possible, with configurable bind/origin/data and retests | Possible with existing loopback app and per-host proxy/config |
| Browser Secure Context | **No** for ordinary RFC1918 HTTP URLs; `randomUUID` currently breaks | **Yes** when trusted HTTPS certificate is valid |
| Session confidentiality/integrity in transit | **No TLS**; Bearer tokens and PDCA data exposed to network interception/alteration | TLS protects browser ↔ proxy; backend hop stays on same Host loopback |
| IT network control | Required: restricted RFC1918 interface, source ACL/Firewall, no Internet/VPN/guest; no client identity from IP alone | Also required; plus trusted server IP-SAN certificate and an approved client/identity authorization mechanism |
| Deployment dependencies | No proxy/certificate required; more application work | Proxy/TLS configuration and lifecycle are operational dependencies; less core app change |
| Managed Recovery safeguard | **HIGH**: must redesign `withStoppedServer` binding/exclusivity; test all operator actions | **LOWER**: current Node loopback port reservation can remain unchanged |
| Data-path migration | Preserve Pointer and Audit/Witness | Preserve Pointer and Audit/Witness |
| Observability | Host log + IT Firewall/ACL evidence; cannot claim individual identity from self-entered name | Host log + proxy/TLS/identity logs + IT Firewall/ACL evidence |
| Existing factory evidence | PDCA **NOT TESTED** | PDCA **NOT TESTED** |

Ratings describe implementation/control implications, not measured speed or cost. Neither option is accepted simply because Float Monitor uses HTTP. **An IP literal never requires a separate static IP setting on every client**: clients enter the same Host URL; only the Host address, client network access and, for HTTPS, certificate trust need administration.

## 4. Proposed decision and conditional boundaries

**RECOMMENDED, NOT APPROVED: B — HTTPS-over-IP.**

- Keep Node `127.0.0.1:PDCA_PORT`; use an IT-approved HTTPS reverse proxy on the **same physical Host** (Laptop now, Dedicated Server later), with a private IP in the public URL.
- The server certificate must have the exact **iPAddress SAN** and a trusted issuing chain. The same Host IP in `PDCA_ORIGIN` must match the browser origin, including nonstandard port. IT must supply IP address stability, rotation and renewal procedures. Do **not** bypass TLS warnings or disable certificate verification.
- Preserve `Host`, real `Origin` and `Authorization: Bearer` across proxy. Remove all client-provided `X-Pdca-Ingress-Key` and `X-Pdca-Operator-Key` and inject only the authorized server-side ingress key. IT administrative operations remain local/role-controlled by default. Do not use HTTP Basic Authentication that overwrites the PDCA Bearer header.
- Authorize devices/people independently of IP/network membership and independently of user-entered Display Name, using mTLS with demonstrated enrollment/revocation or an equivalent IT-approved access mechanism. Keep strict LAN/VPN/Internet separation.
- Preserve existing Workspace/Audit/Pointer/Witness, local NTFS, Backup/Restore and single-writable-Host constraints. Do not change journal mode as part of a transport migration.
- Update the prepared LAN verification scripts **if needed** for literal IPv4 (e.g., do not require a DNS A-record for a numeric IP); add certificate and header-injection negative tests. This is **proposed Phase 1–3 work after authorization**, not work performed here.

**Conditional alternative: A — Direct HTTP + exact private IP.**
- May be separately considered for **fictional-data, non-Official-Pilot** factory LAN dry run only if IT security expressly accepts unencrypted traffic and provides per-Host, source-scoped Firewall/ACL evidence. This is not a default permission to handle real PDCA records.
- Direct HTTP with live Session Bearer tokens is a security trade-off, not a harmless launch-flag change. A broader use would require a distinct, explicit security risk decision and revisiting approved G-07/G-11 and company policy. A mere isolated server or a Float Monitor signoff is insufficient.
- Before any A implementation: add **fail-closed** exact private-NIC bind validation (not `0.0.0.0` by default); allow explicit HTTP origin with strict Host/Origin checks; implement correct cryptographic UUID v4 generation in insecure contexts (without `Math.random`); prove no HTTPS-only browser feature regressions; and redesign/test active-host exclusivity across all bound IPs to prevent ADOPT/ACTIVATE/ROLLBACK while serving users.
- No weakening of permission checks, operator keys, database selection, audit, witness or backup/restore.

**Rejected within this ADR:** unrestricted `HOST=0.0.0.0` default; removing IT/security approval obligations; silently making `allowRequest` permissive via empty `PDCA_ORIGIN` on a LAN listener; relaxing certificates; opening Node, SQLite or Recovery APIs to Internet/VPN; replacing Managed DB Pointer with ad-hoc DB-path aliases.

## 5. IT acceptance boundary — inspect, not assume

Company IT must produce **actual Factory Host and Client evidence for PDCA** covering the table in [IT Network Acceptance Matrix](../../deployment/IT_NETWORK_ACCEPTANCE_PHASE0.md). Scope includes:

- Approved Windows Host (Laptop and later IT Server), owner/backup operator, OS protection, local NTFS/ACL, endpoint/Service uptime, stable NIC private IP, port allocation and Float Monitor coexistence.
- Allowed **and denied** factory clients, VLANs/subnets, Windows Firewall/Network ACL, absence of guest, Internet, VPN and unauthorized direct Node paths. Tests must correlate denied requests with the correct Firewall/Proxy enforcement point; a generic timeout or DNS failure is not proof of authorization.
- For B: a valid IP SAN certificate, client trust in Edge, TLS termination and upstream loopback isolation; private key storage, expiry/renewal/rotation, mTLS or equivalent authorization plus deprovisioning test, Host/Origin and header trust.
- For A if considered: recorded acceptance of HTTP's confidentiality/integrity limitation, boundary-specific Firewall evidence, and independent session-security risk assessment; no real-data approval inferred.
- Data paths, Active Pointer/Workspace+Audit Witness, stop/recovery exclusivity, Backup/Restore, RPO ≤4h and RTO ≤1 working day where infrastructure/backup survives, multi-PC edit persistence, ~200-Node/~10-editor workload, and F-07 contention on actual target environment.
- CI/ZIP checksums, Node version and licensing/no-new-spend; IT/Security authorization **separate from** Project Owner product/Pilot GO.

IT controls the infrastructure and must supply evidence; this ADR does not assign an individual IT approver, host IP, subnets, ports, certificate issuer, costs, date or new budget.

## 6. Phase 1–3 authorization boundary

### If B is approved
- **Phase 1 / Network:** prefer **config/template/script work**, not app server rebind. Prove `https://<IP>` routing with public-origin Host/Origin validation; correct existing diagnostic scripts for IP-literal URL where necessary.
- **Phase 2 / Browser:** do **not** add insecure-context fallbacks merely to support an option not selected; verify Secure Context plus session/auto-save/UUID/collaboration/exports in the target Edge version.
- **Phase 3 / Data:** reuse existing `PDCA_*` paths and managed Pointer. Supply separate IT-controlled `host.env` templates for Laptop and Server without changing source/schema. Validate backup/recovery and migration; don't overwrite live data.

### If A is explicitly approved for a bounded use
- **Phase 1:** implement guarded private-IP binding, fixed port and HTTP exact-Origin mode, preserve authorization, avoid wildcard by default, **repair host-stopped/exclusivity logic** before enabling Recovery.
- **Phase 2:** correctly implement insecure-context UUID v4 fallback and run real Edge HTTP regression incl. sessions, new/edit/link, autosave, export, history, uploads, and logout/disconnect.
- **Phase 3:** verify full managed data-path isolation, Pointer/Audit/Witness/Recovery tests and synthetic migration/rollback; no alternate untracked DB-path mode.

**For either choice:** staged Draft PR, source SHA, windows CI, browser and network evidence, security review, rollback, and explicit owner authorization **before coding**. Existing PR #1 and F-07 status must be reconciled before release. **This Phase 0 ADR does not authorize Phase 1, 2, 3, merge, production data or Factory deployment.**

## 7. Phase 0 exit criteria and decision record

- [x] Evaluated relevant PDCA and Float Monitor source code and operational reference documents
- [x] Distinguished verified source behavior, options, constraints and open operational unknowns
- [x] Documented B as recommendation; A as conditional alternative with limits
- [x] Specified IT-owned evidence/NO-GO matrix and proposed change scope
- [ ] Project Owner explicitly selects **B**, **A with bounded use**, or **rework/hold**
- [ ] IT confirms PDCA's independent network/access risk acceptance, planned certificate/identity approach, Host/port availability, license and operating ownership
- [ ] Owner explicitly approves the exact Phase 1–3 implementation scope, tests and stop conditions
- [ ] No implementation or factory signoff claimed in advance of measured evidence

**Phase 0 disposition: DOCUMENT PREPARED / DECISION PENDING; Phase 1–3 = HOLD.**

### Open questions for IT (not assumptions)
1. Can company IT issue and deploy a trusted HTTPS certificate with a **private IPv4 iPAddress SAN** to the intended clients? What renewal/IP-change process is available?
2. Is there an existing approved TLS/mTLS or access-aware proxy that can run on the Laptop and Dedicated Server without additional cost? How are revoked users/devices denied?
3. Which Host, private NIC address/subnet and allowed client ranges are approved for temporary Laptop and eventual Server? Is TCP 443 (or IT-chosen external HTTPS port) available, with Node port loopback-only?
4. Will a production application with editable PDCA records require encrypted transport and individual/device identity? Is a narrowly scoped HTTP synthetic dry-run exception allowable?
5. Are primary/alternate administrators, on-host backup monitoring and factory maintenance/recovery responsibilities assigned and tested? Is Float Monitor shared-host interference possible?

## 8. Non-goals / invariants

- No removal of business-approved Pilot GO and IT Security approval in project governance; no fabricated in-app approval IDs or extra flags.
- No implementation of SSO, new user login or new database authentication as part of the ADR itself.
- No source/schema changes to the data model, collaboration policy, witness, backup/restore or F-07 remedy.
- No claim that CI success demonstrates browser IP/TLS trust, PC-to-PC access, Factory LAN security or backup recovery.

## 9. References

**PDCA (examined at `428885c4`):**
- [Engineering Source of Truth](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/PROJECT.md)
- [Host implementation](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/src/server.js)
- [Environment config / ingress](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/src/ops.js)
- [Managed recovery / stopped-host exclusivity](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/src/active-db.js)
- [Prepared Laptop Proxy/IT instructions](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/deployment/LAPTOP_HOST_LAN_TEST.md)

**Float Monitor V1.5 (examined at `a12bb73f`):**
- [IT deployment facts](https://github.com/FillGH/Float_Monitor_Demo/blob/a12bb73f389ae734b663426cd23b2d643c3866af/README4IT.md)
- [Direct private-IP validation and server entry](https://github.com/FillGH/Float_Monitor_Demo/blob/a12bb73f389ae734b663426cd23b2d643c3866af/float_monitor_api/pilot.py)
- [HTTP UUID fallback](https://github.com/FillGH/Float_Monitor_Demo/blob/a12bb73f389ae734b663426cd23b2d643c3866af/float_monitor_api/static/app.js)

**Standards/guidance (consulted 2026-11-24):**
- [MDN — Crypto.randomUUID secure context](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [MDN — Crypto.getRandomValues on insecure contexts](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
- [RFC 9110 `4.3.4 — HTTPS certificate IP-ID verification](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.3.4)
- [RFC 5280 `4.2.1.6 — subjectAltName iPAddress](https://www.rfc-editor.org/rfc/rfc5280.html#section-4.2.1.6)
- [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Caddy TLS client_auth directive](https://caddyserver.com/docs/caddyfile/directives/tls)
