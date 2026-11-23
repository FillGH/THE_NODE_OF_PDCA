# THE NODE OF PDCA — Prebuilt Windows Deployment (BUILD 4)

Status: Packaging workflow proposed/implemented on a separate branch. This is NOT a Production Release or Factory LAN acceptance. Core PDCA UI/graph features remain unchanged; recovery operator and managed DB selection have been added. Production acceptance is still pending.

## Decision and scope

- Deploy as a prebuilt Windows ZIP from the exact reviewed source commit rather than running npm on the Factory Server.
- The build environment (GitHub-hosted Windows runner or IT-approved equivalent) runs npm ci against package-lock.json and runs all existing automated tests.
- The package includes the installed node_modules, the source directories, demo assets, fonts, a deployment manifest and verification/smoke scripts.
- Node.js 24 is still required on the receiving Windows Server; no npm or npm Registry connectivity is needed at runtime.
- Source of truth: PROJECT.md and the existing design/PILOT_VERIFY.md and design/BUILD4_HOST_RUNBOOK.md. Nothing in this guide grants permission to expose the app on a network or use real data.

## Workflow and integrity

Run the GitHub Action `PDCA Prebuilt Windows Package` on the packaging branch (push) or its PR against codex/build-increment-4. Two independent Windows jobs are required:

1. Build job: checkout exact commit; setup Node.js 24.11.0; npm ci; npm test; build the ZIP and calculate archive SHA-256; generate DEPLOYMENT_MANIFEST.json listing every packaged file's SHA-256 and size.
2. Clean-machine job: a fresh Windows runner with Node.js 24.11.0 and NO repository checkout, npm ci, npm test or network package installation. Download ZIP; check archive hash; extract; verify all file hashes; use only node to seed a fictional demo, serve it on 127.0.0.1, create a session, read a workspace, export JSON/Excel/PDF, create a workspace and verify persistence after restart.

Only the artifact `PDCA-Prebuilt-Windows-Verified` from a successful complete workflow is eligible for IT review. The intermediate `pdca-prebuilt-candidate` is not approved for deployment.

Manifest fields include sourceCommit, build platform/architecture/Node version, package-lock checksum, direct dependency versions, and SHA-256/size for all application files. ZIP checksum is separate and should travel with the ZIP via IT-approved channels. Do not treat SHA-256 alone as proof of trusted origin; also verify provenance, approved workflow run and accepted source SHA.

## IT receiving procedure (illustrative paths)

1. Obtain the approved ZIP and adjacent .zip.sha256 from the successful GitHub Actions run using an IT-approved transfer mechanism.
2. Before extraction, compare SHA-256. In PowerShell:
   Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\IT-Staging\PDCA-Windows-<sha>.zip'
3. Extract to a NEW, controlled folder; do not overwrite existing code/data or operate on a live instance. Check hashes and Node version using only Node.js:
   node .\tools\prebuilt\verify.mjs .
4. Optional LOCAL synthetic smoke (creates only temporary data in the OS temp directory, then removes it):
   node .\tools\prebuilt\smoke.mjs .
5. IT prepares a separate and ACL-protected environment file and writable local NTFS areas for Workspace SQLite, Audit, Backup, Restore, and logs. Never place credentials, live databases or internal infrastructure paths in public GitHub or the ZIP.
6. For the LAN demo, follow design/PILOT_VERIFY.md: IT-approved HTTPS reverse proxy on the SAME host with authentication/authorization, correct Host/Origin forwarding, removal of client-supplied x-pdca-ingress-key and x-pdca-operator-key, and injection of the IT-owned ingress key. The Node app stays bound to 127.0.0.1:4175. Seed a NEW PDCA_DEMO_DIR for a changed HTTPS origin, then serve with:
   node --env-file="C:\PDCA\config\demo.env" demo/demo.mjs seed
   node --env-file="C:\PDCA\config\demo.env" demo/demo.mjs serve
   Do not re-run seed against an existing demo directory. Do not send the loopback URL to remote clients.
7. Execute actual Factory LAN V-01..V-08 test cases, including allowed/denied/revoked client, concurrent edit, backup/restore, restart and stop/go records. Only fictional data is authorized in this pre-Pilot verification stage.

## STOP / GO

STOP if the artifact origin/source SHA is unknown, ZIP or file checksum fails, Node.js version/platform differs, dependencies are incomplete, a secret/real dataset appears in the ZIP, restore cannot be verified, the HTTPS ingress boundary is bypassed, or any unauthorized client reaches UI/static/API endpoints.

The clean-machine smoke PASS proves packaging and LOCAL runtime behavior on a GitHub Windows runner only. It does not prove company Server compatibility, IT policies, DNS/TLS, network ACL, operator access, 10 simultaneous editors, sustained availability, RPO/RTO or Official Pilot readiness.

## Rollback and change control

Retain the prior known-working ZIP and its manifest outside the live directory. IT must stop the old service, snapshot and validate the current Workspace plus Audit, deploy to a separate directory, and validate before cutover. Rollback application source and database selection are separate decisions; never overwrite or select an older SQLite Workspace without comparing the latest Audit and approved recovery point. Follow design/BUILD4_HOST_RUNBOOK.md for Host migration and recovery. Avoid multiple writable hosts.

The presence of an artifact is NOT an instruction to deploy it. IT security/operations approval and Project Owner go/no-go are still required.


## Managed Recovery Operator — after PR #1 upgrade

The recovery operator is an OPTIONAL, IT-controlled mode enabled by setting an Active DB pointer in the external host environment. This is the approved pre-Factory-LAN improvement; it does not change graph/edit/export behavior. DO NOT enable it on existing data without preserving a verified copy and confirming exact Workspace/Audit paths with IT.

### First-time managed setup

1. Seed fictional demo data WITHOUT `PDCA_ACTIVE_DB_POINTER` using the existing demo instructions, then STOP the demo service. The demo launcher explicitly refuses managed mode, to prevent accidentally opening or seeding the selected live database.
2. IT prepares a SEPARATE host environment outside the repo. Example placeholders (adjust paths and approved security settings):

```dotenv
PDCA_DB=C:\PDCA-LAN-Test\data\workspace.sqlite
PDCA_AUDIT=C:\PDCA-LAN-Test\data\workspace.audit.sqlite
PDCA_DATA_ROOT=C:\PDCA-LAN-Test\data
PDCA_ACTIVE_DB_POINTER=C:\PDCA-LAN-Test\data\active-db.json
PDCA_BACKUP_DIR=C:\PDCA-LAN-Test\data\backups
PDCA_RESTORE_DIR=C:\PDCA-LAN-Test\data\restore
PDCA_OPS_LOG=C:\PDCA-LAN-Test\data\operations.jsonl
PDCA_PORT=4175
```

All paths MUST be absolute, under the same PDCA_DATA_ROOT directory and on IT-controlled local storage. The active pointer MUST NOT be included in source control or in the Prebuilt ZIP; protect it using Windows ACL. Add `PDCA_ORIGIN`, `PDCA_INGRESS_KEY`, IT/Phil operator keys and reverse-proxy settings under the existing IT security requirements. Ensure the audit filename matches the actual Audit created by the application — DO NOT copy a sample value blindly.

3. Stop and disable automatic restart of the Node service. Run the PowerShell operator from the extracted Prebuilt directory, using the external environment file:

```powershell
.\tools\recovery\recovery-menu.cmd 'C:\PDCA-LAN-Test\config\host.env'
# Or invoke PowerShell directly when company policy allows it:
powershell.exe -NoProfile -File .\tools\recovery\recovery-menu.ps1 -EnvFile 'C:\PDCA-LAN-Test\config\host.env'
```

4. Enter the IT key in the hidden prompt. Choose **3 ADOPT** once; it checks the current Workspace/Audit and atomically creates the pointer. For operational inspection choose **1 Status**. Once adopted, start the NORMAL application via `node --env-file="<host.env>" src/server.js` (not `demo/demo.mjs serve`) so startup, backup, diagnostics and recovery use the selected database pair.

### Controlled restore sequence

```text
1 Status → 2 List Backups → 4 Restore <snapshot ID> to isolated staging
→ review restore.json and inventory → 5 Prepare <stage ID> (IT only)
→ STOP & disable Node service → 6 ACTIVATE <stage ID> → start host → Status and data verification
```

**ACTIVATE** (non-destructive) is allowed only when the candidate's FULL inventory matches the current live inventory, including non-Audit graph changes. If the current database is lost/corrupt or the candidate differs, the command blocks and requires **ACTIVATE-RECOVERY** (IT-controlled, deliberate recovery-point acceptance). The IT approver MUST separately review the incident, possible data loss, latest snapshot timestamp, User/Node records, backup RPO and retained evidence before typing ACTIVATE-RECOVERY. This command never silently merges newer content or overwrites the former DB.

**ROLLBACK** returns to the previous pair only when full inventories are identical. It refuses when even a non-Audit edit could be lost. If blocked, leave the service stopped and use the formal recovery/reconciliation process rather than editing paths. A port-availability guard blocks activation while the configured Node port is occupied, but it is not a distributed lock; IT must also stop other writable instances and disable auto-restart during switching.

The new `active-db.json` pointer is the single database-selection authority in managed mode. DO NOT manually edit the pointer or `PDCA_DB` to bypass it. A missing/malformed pointer or stale Workspace/Audit pair BLOCKS startup. The operator must run from the approved service Host with the same external environment configuration; update the configured Source at IT-controlled change control.

### Minimum V-07 recovery gates before Factory acceptance

- Verify active-db pointer, source SHA, selected Workspace/Audit pair, and actual DB content after every restart.
- Demonstrate ADOPT only once, restore to Staging, Prepare, ACTIVATE, and ROLLBACK without newer data.
- Demonstrate refusal with a running service, invalid IT credentials, tampered candidate, stale Audit, wrong pointer, and **new post-cutover edit not recorded in the deletion Audit**.
- Demonstrate full disaster recovery from a lost Workspace using surviving valid Audit and explicit ACTIVATE-RECOVERY approval (with incident/RPO/RTO documentation).
- Run actual Backup/Restore timing checks, retention, fail/retry and Host access checks against the approved Factory LAN environment.
- A ZIP or automated test PASS alone does not satisfy IT security approval or V-07 Factory recovery acceptance.


### CRITICAL: source-code downgrade and active pointer compatibility

Older BUILD 4 source (before this Recovery Operator increment) **does not read PDCA_ACTIVE_DB_POINTER**. Starting that older source with the original PDCA_DB path after any managed ACTIVATE may silently open an obsolete Workspace even if the managed source was using another database. This is the same class of stale-DB source-rollback hazard encountered in Float Monitor.

- **STOP:** Never reinstall, run, schedule, or roll back to pre-pointer PDCA source simply by extracting an older ZIP over the current installation. Do not bypass the pointer by changing PDCA_DB or editing service BAT/PowerShell scripts manually.
- To downgrade software, stop the service, secure the latest Workspace **and** Audit from the ACTIVE pair, check whether any post-cutover writes occurred (including ordinary graph edits that do not appear in deletion Audit), and have IT approve a safe conversion/migration plan with a reversible test before switching service source.
- Prefer redeploying a known-good **pointer-aware** package with the same external pointer and audit intact. If no compatible recovery is possible, keep the service STOPPED and escalate rather than allowing a stale-database startup.
- Validate Source SHA, active pointer serial, Workspace/Audit inventory, Backup destination, and actual displayed PDCA content after every source change. Retain the previous source and data until IT acceptance, never overwrite the live pair in place.
