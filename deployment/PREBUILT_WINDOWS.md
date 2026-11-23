# THE NODE OF PDCA — Prebuilt Windows Deployment (BUILD 4)

Status: Packaging workflow proposed/implemented on a separate branch. This is NOT a Production Release or Factory LAN acceptance. No application logic has been changed.

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
