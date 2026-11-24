# Direct Private-IP LAN — implementation candidate operator instructions

**DRAFT — not approved for Factory deployment.** Same application package on laptop and IT server. No reverse proxy, Caddy, certificates, DNS or npm registry required by Direct LAN. HTTP is cleartext; IT must confirm allowed endpoints and data scope before LAN access. Keep earlier HTTPS package for rollback, not as a prerequisite.

## Prepare (IT only, synthetic data first)
1. Stop and disable any previous PDCA Host, including old versions not participating in the new managed exclusion. Ensure one canonical local NTFS data root per dataset, no aliases/nested alternate roots, no network/mapped disk, and restrict config, data and operator keys with IT-controlled ACL. Never delete/replace .pdca-host-exclusion.sqlite; it is the persistent SQLite OS-lock coordination file, not Workspace or Audit. Do not share or copy it as data.
2. Use the verified package and approved Node version. In a clean CMD without ambient PDCA_* variables, create an external config directory and an empty external data directory with restricted ACL. IT chooses real assigned RFC1918 IP and free port. Example only:
   ~~~cmd
   tools\direct\setup.cmd "C:\PDCA-config\host.env" 192.168.1.50 4175 "D:\PDCA\data"
   ~~~
   Setup verifies manifest and generates two distinct operator keys once in external host.env, never displays values, never overwrites files. Repeat without the final three arguments to preview existing config; use local NTFS permissions (Windows mode bits do not guarantee ACL).
3. For fresh synthetic testing only, seed using the existing **local-only** demo launcher, with PDCA_DEMO_DIR set to the empty configured data root in a separate clean CMD. Do NOT load host.env for demo seed. Close that CMD afterward (clear ambient PDCA_*). The seeded example document links may reference loopback; do not mistake those links for LAN connectivity. For existing data STOP and use reviewed migration; never seed over data.
   ~~~cmd
   set "PDCA_DEMO_DIR=D:\PDCA\data"
   node demo\demo.mjs seed
   ~~~
4. IT uses tools\recovery\recovery-menu.cmd with host.env and the local IT key (not remote HTTP) to ADOPT the validated Workspace/Audit. The Active Pointer is required; setup never invents a new database or resets a pointer.
5. Run tools\direct\diagnose.cmd "C:\PDCA-config\host.env". This only validates configuration and active paths; run local IT Status to verify pair integrity.
6. Run tools\direct\start.cmd "C:\PDCA-config\host.env". Owner laptop browser and approved peer PCs use the same printed HTTP URL. IT must restrict actual access by Firewall/ACL/NAC, deny unapproved clients, Internet, guest and VPN. No client configuration needed. Stop using Ctrl+C and confirm service stopped. Unexpected process termination releases the coordination database OS lock; do not delete its file. Before legacy downgrade, stop all processes and validate source/data compatibility. Never run a legacy binary alongside a candidate.
7. No HTTP admin, Audit deletion-log or Restore endpoint in Direct mode. Use local CLI/menu with credentials. Deletion Audit is available through option 9 to IT after stopping the Host; it validates the managed pair and reads audit rows without transmitting operator credentials across HTTP. Direct mode trusts IT admission, not self-entered display names; session token/payload is not TLS-protected.

## Known verification boundary
Factory multi-PC and actual Edge workflow, ACL, data classification, load/F-07 and migration evidence remain separate; no production permission inferred. Follow ADR revision 2 / IT matrix. Do not ship until tests, review and authorization pass.
