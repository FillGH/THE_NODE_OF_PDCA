# ADR-001 — Direct Private-IPv4 LAN Deployment (revision 2)

| Item | Record |
|---|---|
| Date | 2026-11-24 (Asia/Bangkok) |
| Status | **OWNER DIRECTION RECORDED / IMPLEMENTATION PLAN PREPARED / BUILD HOLD** |
| Selected direction | A — Direct HTTP to a concrete private IPv4, no reverse proxy |
| Operational reference | Float Monitor V1.5.0 |
| Authority | Project Owner (architecture/product); IT (network, security, infrastructure) |
| Runtime baseline | PDCA `428885c44dda6aef7dd0bfbc8bd9cce13922388f`; PR #1 remains unmerged |
| Previous ADR | `9a2087cffe7b199139df2afbf84840e43e4b425a` proposed HTTPS-over-IP; retained in Git history |
| Companion | [Implementation plan](../../deployment/DIRECT_PRIVATE_IP_IMPLEMENTATION_PLAN.md), [IT acceptance matrix](../../deployment/IT_NETWORK_ACCEPTANCE_PHASE0.md) |

## 1. Owner direction and authority

On 24 November 2026 the Project Owner stated: no reverse proxy; use the simplest IT-compatible approach with minimal configuration, as used in Float Monitor; IT has already permitted this approach; IT Server must not need to fetch npm packages. The subsequent instruction is to prepare the plan and wait for a separate execution instruction.

**Decision for planning:** adopt Float Monitor-style Direct HTTP/private IPv4 for Laptop Host+Client and Dedicated IT Server, with the existing PDCA prebuilt Windows distribution. IT permission is **owner-reported**, not independently verified by CI. Scope, accepted HTTP risk, actual network controls and authority to use real PDCA records still require evidence in the ordinary IT/Factory acceptance process. Do not introduce application approval IDs or fake approval flags. This revision does NOT authorize source implementation, network changes, a merge, deployment, live data or Official Pilot.

## 2. Verified source baseline and decision drivers

- PDCA currently binds to loopback, expects HTTPS origin and a proxy ingress key. Browser Session uses Bearer tokens; several frontend call sites use `crypto.randomUUID()`, which requires a secure context. Direct HTTP over RFC1918 IP requires deliberate server and browser adaptation, not merely changing the bind address.
- The prior HTTPS/mTLS kit is present in the runtime baseline but has not passed Factory LAN acceptance. It is a rollback/reference artifact, not the new target deployment requirement.
- `src/active-db.js` uses `withStoppedServer()` and a loopback port reservation for ADOPT, MIGRATE-LEGACY, ACTIVATE and ROLLBACK. Binding to the private NIC could allow the loopback reservation while a real Host is serving. This is a data-integrity blocker until a shared exclusion mechanism is designed and verified.
- `PDCA_DB`, `PDCA_AUDIT`, `PDCA_DATA_ROOT`, `PDCA_ACTIVE_DB_POINTER`, `PDCA_BACKUP_DIR`, `PDCA_RESTORE_DIR`, `PDCA_OPS_LOG` and `PDCA_PORT` already support environment-specific data. Active Pointer/Workspace/Audit/Witness remains the authority. Do not introduce a parallel data-path authority.
- Float Monitor V1.5 uses explicit private IPv4 binding (not wildcard `0.0.0.0`), HTTP and IT-controlled Firewall/ACL. Its frontend has a cryptographic ID fallback. Its source describes network risk limitations. Its separate approval is not evidence of PDCA reachability or data integrity.
- F-07 remains MITIGATED / OPEN; representative Factory Load Verification remains required. Changing LAN transport alone is not a remedy for SQLite contention.

## 3. Alternatives and trade-offs

| Criterion | A — Direct HTTP/private IPv4 (selected) | B — HTTPS-over-IP/proxy (not selected) |
|---|---|---|
| Client URL | `http://<HOST_IP>:<PORT>` | `https://<HOST_IP>[:PORT]` |
| Host configuration | Private NIC IPv4, port, data root | Proxy, trusted IP-SAN cert, private key, origin, ingress secret, authorization configuration |
| Client certificate/DNS/proxy | None required by the target app | Additional trust/identity and proxy configuration |
| Browser | Cryptographic UUID fallback and HTTP feature verification needed | Secure context with valid certificate |
| Session/data in transit | No transport confidentiality, integrity or server authentication; Bearer interception/replay and manipulation risks | TLS provides confidentiality/integrity and server authentication when trust is valid |
| Network authorization | IT-controlled independently of self-entered name; approved endpoint/network controls and denied-client proof | IT controls plus proxy-level authorization |
| Recovery | Shared host/maintenance exclusion redesign and retest mandatory | Existing loopback design could be retained, subject to verification |
| Owner preference | Matches stated operational constraints | Rejected as unnecessarily complex for current requested deployment |

Selection reflects operational simplicity, not security equivalence. HTTP does not become encrypted or safe solely because an IP is private. If company security policy or data classification requires TLS or controls unavailable on the proposed LAN, STOP and return to an architecture decision. Do not bypass policy to preserve convenience.

## 4. Target design and invariants

- One Windows prebuilt package, same source SHA and dependencies, both environments; Laptop is Host + Client; peers use same URL. Dedicated Server uses its own IP/port/data root and separate dataset/secrets. Only one writable Host per dataset.
- Retain loopback as safe local development default. Direct LAN mode is selected by explicitly configured and validated assigned RFC1918 IPv4. Reject unspecified, wildcard, public, multicast, invalid, or unassigned bindings and invalid ports. No implicit external exposure on missing config. Validate exact canonical Host/Origin; reject cross-origin writes and untrusted forwarded/privileged headers.
- Proposed minimal IT inputs: `PDCA_BIND_HOST`, `PDCA_PORT`, `PDCA_DATA_ROOT`. Derive origin and conventional paths consistently, subject to backwards compatibility. Managed Active Pointer and explicit existing data paths must not be overwritten or silently reinitialized. Use a read-only Diagnose preview. No new DB_PATH aliases, unnecessary setup prompts or approval flags.
- Do not require proxy, Caddy, TLS certificates, DNS changes, or per-PC static IP/config. IT still controls host address stability, Windows Firewall/ACL, authorized clients/segments and restrictions from Internet, VPN and guest/unapproved devices.
- Preserve application Session/Bearer mechanics, collaboration, auto-save, ID uniqueness, role separation, exact data authority, witness, journal mode and verified recovery. Display Name is not identity authentication. All remote administrative/audit/recovery paths must be explicitly denied under Direct HTTP; existing local operator CLI with keys stays local. If remote administration later becomes necessary, raise separate change.
- Preserve IT-owned operator credentials outside ZIP/repo, distinct, securely generated and not sent by remote HTTP clients. Do not reuse an ingress key as a client password. Direct mode must not silently result from deleting `PDCA_ORIGIN` or bypassing authorization.
- Prebuilt Windows installation: no npm invocation, npm Registry/network download, or runtime dependency installation on Laptop/IT Server. CI may continue npm ci/build/test, and Node.js runtime is still a prerequisite unless a separately validated future package includes it. Bundled npm ecosystem packages are not removed.
- Reuse local NTFS, Active Pointer, Workspace/Audit/Witness, Backup/Restore, F-07 controls. No schema/business logic changes outside the adaptation; no manual pointer editing.

## 5. Implementation and IT gate

Execute only after separate Owner instruction, following [the detailed plan](../../deployment/DIRECT_PRIVATE_IP_IMPLEMENTATION_PLAN.md). WP-01 documentation is prepared here; WP-02 onward are HOLD. Verify factory network in both environments (not Float Monitor by inference) using [IT acceptance matrix](../../deployment/IT_NETWORK_ACCEPTANCE_PHASE0.md). No true production records before appropriate IT/data authorization and applicable acceptance. No extra numerical performance target is invented. Existing D-065/D-066, V-01–V-08, G-07/G-11 and usability/recovery criteria remain.

## 6. References

- [PDCA baseline/project](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/PROJECT.md)
- [PDCA server](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/src/server.js), [ops config](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/src/ops.js), [recovery exclusion](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/428885c44dda6aef7dd0bfbc8bd9cce13922388f/src/active-db.js)
- [Float Monitor V1.5 IT reference](https://github.com/FillGH/Float_Monitor_Demo/blob/a12bb73f389ae734b663426cd23b2d643c3866af/README4IT.md), [private-IP validation](https://github.com/FillGH/Float_Monitor_Demo/blob/a12bb73f389ae734b663426cd23b2d643c3866af/float_monitor_api/pilot.py), [HTTP random ID fallback](https://github.com/FillGH/Float_Monitor_Demo/blob/a12bb73f389ae734b663426cd23b2d643c3866af/float_monitor_api/static/app.js)
- [MDN randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
