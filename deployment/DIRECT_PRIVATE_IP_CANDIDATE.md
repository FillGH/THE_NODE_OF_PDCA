# Direct Private-IP LAN — implementation candidate operator instructions

**DRAFT — not approved for Factory deployment.** Same application package on laptop and IT server. No reverse proxy, Caddy, certificates, DNS or npm registry required by Direct LAN. HTTP is cleartext; IT must confirm allowed endpoints and data scope before LAN access. Keep earlier HTTPS package for rollback, not as a prerequisite.

## 1. Prepare (IT only, synthetic data first)
1. Stop and disable any previous PDCA Host, including old versions not participating in the new managed exclusion. Ensure one canonical local NTFS data root per dataset, no aliases/nested alternate roots, no network/mapped disk, and restrict config, data and operator keys with IT-controlled ACL. Never delete/replace .pdca-host-exclusion.sqlite; it is the persistent SQLite OS-lock coordination file, not Workspace or Audit. Do not share or copy it as data.
2. Use the verified package and approved Node version. In a clean CMD without ambient PDCA_* variables, create an external config directory and an empty external data directory with restricted ACL. IT chooses a real assigned RFC1918 IP and an approved fixed port. Before Setup/ADOPT, confirm the exact endpoint can be bound on the intended Host (not just that it responds to ping or has no listed listener); if denied or occupied, STOP and have IT resolve the endpoint. Do not automatically modify OS reservations/firewall, retry ADOPT or bypass its independent port/lease checks. A preflight is point-in-time evidence only. CI may choose an OS-allocated available port for synthetic tests; this is not the Factory configuration procedure. Example only:
   ~~~cmd
   tools\direct\setup.cmd "C:\PDCA-config\host.env" 192.168.1.50 4175 "D:\PDCA\data"
   ~~~
   Setup verifies manifest and generates two distinct operator keys once in external host.env, never displays values, never overwrites files. Repeat without the final three arguments to preview existing config; use local NTFS permissions (Windows mode bits do not guarantee ACL).
3. For fresh synthetic testing only, seed using the existing **local-only** demo launcher, with PDCA_DEMO_DIR set to the empty configured data root in a separate clean CMD. Do NOT load host.env for demo seed. Close that CMD afterward (clear ambient PDCA_*). The seeded example document links may reference loopback; do not mistake those links for LAN connectivity. The explicit --existing-empty option preserves the existing directory/ACL and rejects any nonempty or aliased directory; do not retry over a partially initialized directory. For existing data STOP and use reviewed migration; never seed over data.
   ~~~cmd
   set "PDCA_DEMO_DIR=D:\PDCA\data"
   node demo\demo.mjs seed --existing-empty
   ~~~
4. IT uses tools\recovery\recovery-menu.cmd with host.env and the local IT key (not remote HTTP) to ADOPT the validated Workspace/Audit. The Active Pointer is required; setup never invents a new database or resets a pointer.
5. Run tools\direct\diagnose.cmd "C:\PDCA-config\host.env". This only validates configuration and active paths; run local IT Status to verify pair integrity.
6. Run tools\direct\start.cmd "C:\PDCA-config\host.env". Owner laptop browser and approved peer PCs use the same printed HTTP URL. IT must restrict actual access by Firewall/ACL/NAC, deny unapproved clients, Internet, guest and VPN. No client configuration needed. Stop using Ctrl+C and confirm service stopped. Unexpected process termination releases the coordination database OS lock; do not delete its file. Before legacy downgrade, stop all processes and validate source/data compatibility. Never run a legacy binary alongside a candidate.
7. No HTTP admin, Audit deletion-log or Restore endpoint in Direct mode. Use local CLI/menu with credentials. Deletion Audit is available through option 9 to IT after stopping the Host; it validates the managed pair and reads audit rows without transmitting operator credentials across HTTP. Direct mode trusts IT admission, not self-entered display names; session token/payload is not TLS-protected.

## 2. Backup and daily operation (IT)

- Automatic verified Workspace snapshot on startup and every 2 hours while Host runs; rolling retention 30 days. Review operations.jsonl, backup-verified, failures and disk alarms. Menu 1 Status and 2 List Backup IDs; status BUSY/RETRY is not PASS; retry when writers settle. Assign primary/alternate admin and alert receiver before Factory test.
- D-046/D-106 require Host-only backup for initial scope; off-host database backup is optional unless required by IT policy (resolve any policy conflict before deployment). Total Host-storage loss may be unrecoverable. Snapshot alone does not contain the complete Audit. If IT elects or requires off-host disaster recovery, it must preserve a coherent, restorable Workspace/Audit pair and associated verified snapshots, external configuration/keys (separate restricted secret storage), active state and logs. For planned cold preservation of a healthy managed dataset, first settle and verify committed saves (see 4.1), then block access, stop/disable all writers and confirm Status, then copy stopped verified pair and required operational state into IT-controlled storage. Never copy live SQLite as a raw pair. Record SHA-256, source paths, cut, timestamp and inventory; test restoration. Do not copy the exclusion lock as dataset data or delete it on the original Host. Keep prior package and approved recovery instructions.
- Confirm RPO ≤4 hours and RTO ≤1 working day by timed Factory rehearsal with surviving backup/infrastructure; backup interval is not proof of RPO. Off-host retention/schedule, if applicable, is an IT decision; not yet verified.

## 3. Managed recovery and rollback

Use clean CMD in verified app and tools\recovery\recovery-menu.cmd "C:\PDCA\config\host.env". IT key is entered at hidden prompt. For planned maintenance settle and verify committed saves before closing access (see 4.1). For an incident, contain access immediately if needed. Stop/disable all writers before maintenance; preserve the latest available state, failed-state evidence and verified backups. If Status fails because the live pair is damaged, record the failure; do not treat it as PASS or require a healthy pair as a precondition to an explicitly approved recovery from loss. Menu 1 Status, 2 List Backup IDs, 4 Restore to staging (choose snapshot ID), 5 Prepare candidate (stage ID). Inspect restore.json, cutoff, checksum, inventory and Preview Audit. A held/failed report is STOP. Never pair Preview Workspace with Live Audit, never open it through an unmanaged server, never edit pointer JSON. For preview/rehearsal use an isolated approved copy with its own managed root and matching pair; no simultaneous writer to authority.

Menu 6 ACTIVATE (exact match only): enter prepared stage ID, then ACTIVATE. Candidate is promoted out of staging; pointer selects new pair. If mismatch or Live loss, ordinary activation refuses; ACTIVATE-RECOVERY only after documented IT/Owner acceptance of recovery point and possible loss of non-Audit changes. Start through direct Start CMD and verify Status, IDs, revisions, nodes, relationships, images, History, Trash, Action, saved exports and first verified backup; reopen LAN only after approval. Preserve previous pair and rollback state.

Menu 7 ROLLBACK (type ROLLBACK) only when stopped and full inventory remains equal; any post-cutover write or witness mismatch can block it. If blocked, preserve both versions and reconcile/recover; never force. Menu 9 Deletion Audit only stopped Host. Source rollback is separate: previous source may not support pointer/witness; never downgrade over live data. Test compatible source on a copy and approve return path first.

## 4. Migration — Laptop to Dedicated Server

Preparation only until Gate IV authorized. For managed-to-managed transfer use the same verified artifact SHA on both environments; different external config, fixed assigned IP/port, data root and fresh keys. Legacy enrollment is a distinct upgrade path, not a claim that the legacy source runs this package.

### 4.1 Common cutover preparation

Announce maintenance; stop new editing/admission while allowing existing authorized editors to finish and verify their committed saves before closing access. Resolve or explicitly preserve unsaved drafts under IT-approved handling; a local draft is not a committed record. Record the last agreed saved state. Then block all client access, stop/disable source Host, scheduled restart and all legacy writers. Confirm processes stopped before capturing files. No two writable hosts, no raw live SQLite copy, no copying source Active Pointer as target authority. Keep originals, old runtime and backup evidence under IT-controlled ACL.

### 4.2 Classify source before choosing a path

| Source type | Required stopped-source evidence | Next path |
|---|---|---|
| Managed, valid Active Pointer and witness-enabled pair | Menu 1 Status PASS; record authoritative current Workspace/Audit paths, cut, project count, inventory, pointer/previous pair and backup evidence | 4.3 then 4.4 A |
| Authentic pre-witness BUILD 4 pair, no Active Pointer | Review legacy configuration, source version, actual Workspace and matching Audit, saved IDs/counts/revisions and cutoff/backup evidence using source-compatible review; preserve cold originals and hashes | 4.3 then 4.4 B |
| Missing or corrupt pointer from previously managed source, unknown version, mismatched/missing pair or ambiguous authority | STOP; preserve files and investigate through managed recovery or separately approved migration | Do not use either enrollment path as a bypass |

Legacy source has no managed pointer: do not require Managed Status or current Direct inspect on that source, create a pointer to make Status pass, or ADOPT its original files. R-14 / MIGRATE-LEGACY validates the legacy inventory and cutoff and checks the absence of witness tables on isolated copies before migration. If provenance, inventory or cutoff cannot be established, STOP and obtain an IT-reviewed recovery/migration plan; do not guess which pair is authoritative.

### 4.3 Target preparation (both paths)

Install/verify target ZIP; run target Setup with an empty local NTFS data directory (before copying); do not seed. Keep target inaccessible to ordinary users; confirm assigned endpoint bindability and ACL. Target pointer must be absent. Copy only the verified stopped-source Workspace and matching Audit into new target root as workspace.sqlite and workspace.sqlite.audit.sqlite (or separately reviewed explicit paths within that root). Compare SHA-256 of copied files before enrollment and keep the source originals unchanged. Retain source pointer/previous pair (if present) and historical backup evidence separately. Do not transfer source lock, old host.env or blindly import old restore-stage paths. Target Setup generates new keys.

### 4.4 Target enrollment — choose A or B, not both

- **A — Managed source:** Menu 3 ADOPT validates and reseals the copied current witness-enabled pair and creates a new target pointer. Menu 1 Status; compare source cut/project count and saved inventory.
- **B — Pre-witness legacy source:** With pointer absent, set explicit PDCA_DB / PDCA_AUDIT to the copied legacy pair in external target host.env if needed (absolute, distinct paths within root). Menu 8 MIGRATE LEGACY COPY, confirm MIGRATE-LEGACY. The operation checks legacy inventory/cutoff and enrolls witness on a new isolated candidate, comparing full inventory before/after. It returns candidate paths, project count and cutoff; review against the preserved source evidence. Native SQLite journal recovery may run on the target input copies; do not point migration at original source files. If successful, set PDCA_DB / PDCA_AUDIT to the returned candidate paths in external host.env; then Menu 3 ADOPT, confirm ADOPT, Menu 1 Status. Do not manually edit the pointer or enroll source originals. A failed/refused operation is STOP; preserve inputs and reports, do not bypass guards or seed over existing files.

### 4.5 Verify and approve cutover / return

Diagnose/Start target via direct CMD launchers; verify actual Edge, IDs, saved data, attachments, History/Trash, revisions/conflict metadata, exports and first verified backup. Compare the same saved records and inventory against the source evidence; do not require equal database-file hashes after intentional witness reseal. Migration does not automatically recreate prior pointer history or validate imported historical snapshots; retain them and separately rehearse restore compatibility. Any writes during verification must be tracked; prefer read-only comparison of authoritative data and separate synthetic write tests on isolated data. Record cutover time and evidence. Gate IV/IT must approve target and new URL before users connect.

If failure occurs before target receives any new authoritative writes, stop/disable target and preserve evidence. Revalidate preserved source using its applicable managed or legacy procedure, verify original approved runtime/authority and obtain documented IT GO before returning. If target has received new authoritative writes, source may be stale; do not restart it as authority. Preserve latest target pair and reconcile/transfer back under a separately reviewed migration with full inventory, witness (where applicable), recovery point and rollback rehearsal. Never run both or blindly copy an absolute pointer. If proof is missing STOP.

## 5. Factory evidence boundary

Use IT-N01–N14 and V-01–V-08, separate laptop and server records. CI package verification is not Factory deployment or actual IT permission. Record source SHA, ZIP SHA, Node/Windows/Edge, Host code, time, expected and observed results, evidence location, verifier, PASS/FAIL/NOT TESTED/OUT OF SCOPE. F-07 is mitigated in CI, Factory workload remains OPEN. No real data/Pilot without separate approval.
