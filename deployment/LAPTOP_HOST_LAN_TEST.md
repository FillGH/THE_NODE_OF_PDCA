# HISTORICAL — THE NODE OF PDCA — Laptop HTTPS Proxy Kit

> Superseded by ADR-001 revision 2. Do not follow these proxy instructions for the selected Direct-IP candidate. Start at [README4IT.md](../README4IT.md) and [IT matrix](IT_NETWORK_ACCEPTANCE_PHASE0.md). Retained for historical regression/reference only; no approval to deploy.

**Status: PREPARED DESIGN & TOOLING, not deployed, not Factory Verified.** Project Owner authorized preparing an IT-controlled *fictional-data* LAN test. This document augments [README4IT.md](../README4IT.md) and [PILOT_VERIFY.md](../design/PILOT_VERIFY.md). **Never put live factory data or secret keys in GitHub, ZIP, or screenshots.**

## 1. Topology and acceptance boundary

- The owner's **Windows laptop** operates both (a) the single writable **Node.js/SQLite Host** and (b) its own Edge **Client**.
- All authorized remote factory desktops open the **same IT-issued HTTPS URL** as the owner. No Node.js, npm, app install, or manual IP configuration on ordinary clients.
- The Node.js process remains **loopback-only** at `127.0.0.1:4175`. An IT-approved **HTTPS reverse proxy on that same laptop** listens for LAN requests; **do not expose port 4175** or the database files.
- Use IT-owned **DNS name / certificate / firewall boundary**. If the laptop's LAN IP is dynamic, IT must provide DNS/lease handling; this is a Host-side dependency, not per-client static IP configuration.
- Clients must meet IT's actual identity/device policy. The optional Caddy example here uses **mutual TLS (mTLS)** with client certificates enrolled by IT (possibly centrally via Group Policy). Requiring client certificates is distinct from assigning client IP addresses.
- If IT already operates a compliant HTTPS/identity-aware reverse proxy on the laptop, it may replace the example Caddy configuration, provided the same acceptance checks pass. **Caddy is not automatically installed or approved by this repo.**

### Request path

`Authorized Edge on owner's laptop or colleague PC → HTTPS/mTLS :443 (laptop proxy) → HTTP loopback :4175 (PDCA Node.js) → local Workspace + Audit SQLite`

Proxy must preserve public `Host` and any browser `Origin`, forward the **app's Authorization: Bearer** header, **remove untrusted X-Pdca-Operator-Key**, and **overwrite X-Pdca-Ingress-Key** with the IT-managed key. Display Name inside PDCA is **not** an authentication substitute. **Do not add HTTP Basic Auth to this example**: app fetch requests already use the Authorization header for Bearer sessions.

## 2. IT prerequisites — required before opening LAN port 443

1. Approve this temporary laptop as a shared Host, including endpoint security, laptop uptime/sleep behavior, Windows firewall, permitted company LAN VLAN/subnet, and **denied unauthorized LAN/VPN/Internet** paths. Do not disable the firewall or endpoint protection.
2. Provide internal DNS e.g. `pdca-laptop.factory.example` → the laptop's assigned LAN address (example name only, **not** a usable company hostname). Ensure no external DNS exposure. Configure laptop to resolve the **same name**.
3. Provision a certificate and private key (PEM) for the DNS name, trusted by all approved Edge clients, plus an **authorized client-certificate CA** for mTLS. IT enrolls appropriate client certificates on the owner's laptop and approved colleagues' PCs; use trusted CA and short test validity. Restrict the PEM private key file to IT/service account.
4. If using the example proxy, IT approves and installs a compatible **Caddy 2** executable on the laptop. Verify its publisher/source/version. No automatic binary downloads or dependency installation from these scripts. IT checks certificate support with `caddy validate` before use.
5. Permit **only inbound TCP 443 to the laptop** from approved factory-network segments. Do **not** open Node port 4175, SQLite files, Windows file shares, Internet or company VPN to this app. IT must verify allowed/denied evidence; a successful ping does not prove HTTPS authorization.
6. Use a verified Prebuilt ZIP + **Node.js 24.11.0**. Create the **fictional** Demo Database and its Audit, then IT ADOPT into Managed Mode per `README4IT.md`. Save `host.env` and data under IT-controlled local NTFS outside the app/ZIP. No live data and no manual edits to the Active Pointer.

## 3. Configuration (IT-owned, secrets stay outside repo)

Use the same `PDCA_PORT` (e.g. `4175`) and exactly the same HTTPS origin in every place:

- `C:\PDCA-LAN-Test\config\host.env`: `PDCA_ORIGIN=https://pdca-laptop.factory.example`, `PDCA_PORT=4175`, and distinct cryptographically generated `PDCA_INGRESS_KEY`, `PDCA_IT_KEY` and `PDCA_PHIL_KEY`. Maintain the other paths in `README4IT.md`.
- Copy `tools\lan\Caddyfile.laptop.template` to `C:\PDCA-LAN-Test\config\Caddyfile` (external config). Replace all placeholders: `__PDCA_FQDN__`, `__PDCA_PORT__`, `__SERVER_CERT_PEM__`, `__SERVER_KEY_PEM__`, `__CLIENT_CA_PEM__`. Paths used in Caddyfile should be absolute and forward-slashed, e.g. `C:/PDCA-LAN-Test/config/tls/host.pem`.
- Do not paste secrets into Caddyfile; `start-proxy.ps1` supplies only the existing ingress key in the Child Process Environment. Never print process environment or adapted proxy configuration with secret values.
- Caddy template disables automatic certificate acquisition, HTTP port 80 redirect, and the admin API. It **requires** the supplied mTLS trust pool. No insecure self-signed/browser TLS bypass instructions.

## 4. Run on Laptop — two terminals, laptop also uses Edge

In a terminal in the **verified extracted app directory**, after IT has prepared fictional data and used recovery menu **3 ADOPT**, start **Terminal A**:

~~~powershell
node --env-file="C:\PDCA-LAN-Test\config\host.env" src/server.js
~~~

Open **Terminal B** for local validation (this script **does not change Windows configuration**):

~~~powershell
powershell.exe -NoProfile -File tools\lan\verify-laptop.ps1 -EnvFile "C:\PDCA-LAN-Test\config\host.env" -Mode Running -Caddyfile "C:\PDCA-LAN-Test\config\Caddyfile"
~~~

If local preflight PASS, start the approved HTTPS proxy in **Terminal B**:

~~~powershell
powershell.exe -NoProfile -File tools\lan\start-proxy.ps1 -EnvFile "C:\PDCA-LAN-Test\config\host.env" -CaddyExe "C:\IT-Approved-Tools\caddy.exe" -Caddyfile "C:\PDCA-LAN-Test\config\Caddyfile"
~~~

Caddy must validate the local config before binding HTTPS. If it fails, **STOP**, do not expose the Node port as a workaround.

From **Edge on the same laptop**, open `https://pdca-laptop.factory.example` **not** `http://127.0.0.1:4175`. Use an IT-enrolled client certificate. This verifies the laptop truly serves as **Host and Client through the same authorized public route**.

The laptop must stay on and connected. When testing ends, stop the proxy first, then let users save and stop the Node Host; preserve test Workspace/Audit and backup evidence as directed by IT.

## 5. Test from two or more actual PCs

After IT opens approved ingress to 443, run the **same URL** in authorized Edge on at least one other PC (preferably two PCs). IT may run this supplementary script from each authorized PC to check trusted HTTPS connectivity with the installed client certificate:

~~~powershell
powershell.exe -NoProfile -File tools\lan\verify-client.ps1 -Url "https://pdca-laptop.factory.example" -Expected Allowed -ClientCertThumbprint "<IT-approved client cert thumbprint>"
~~~

No need to install Node/npm on client; this optional script is only a connectivity diagnostic. From browser, separately confirm: both machines can create and open the same **fictional** PDCA, edit different Nodes, see persisted revisions after refresh and restart, and export a document.

IT must also test a **denied** PC/client without an enrolled certificate, a revoked client certificate, Internet/VPN paths, and direct `http://<laptop-IP>:4175`. The denied request must not reach any PDCA UI, image or API. Negative test script may observe a block, but **only proxy/firewall logs linked to the attempted client and correct reason** establish a verified ACCESS DENY. Do not misclassify DNS/TLS/network failure as successful authorization enforcement.

After the positive test, perform the planned `V-01`, `V-02`, `V-05` and remaining `V-03–V-08` on the real factory network. `F-07` concurrent-status mitigation still needs its **own representative workload measurement**; the synthetic GitHub CI test is not Factory Load Acceptance.

## 6. Evidence and Stop/Go

| Gate | Evidence | Status before IT testing |
|---|---|---|
| Source/ZIP integrity | Source Commit SHA, signed/checksummed distribution, manifest, Node version | CI-supported; Factory copy not verified |
| Laptop Host + Client | Authorized HTTPS URL works from laptop itself, same data after restart | NOT TESTED |
| Remote allowed clients | At least one additional PC uses same URL; separate sessions/edit/save/reload | NOT TESTED |
| Denied clients and direct port | Access denial corroborated in proxy/firewall logs; backend 4175 not exposed | NOT TESTED |
| Data persistence and Recovery | Workspace+Audit cut, backup, restore drill, RPO/RTO evidence | NOT TESTED |
| ~10-editor V-05 and F-07 | No silent overwrite, status/backup behavior under representative load | NOT TESTED |
| IT Security and Owner acceptance | Company access/network approval plus separate Owner decision | NOT APPROVED |

**NO-GO** for real data, Official Pilot or release until the actual factory LAN evidence and applicable IT/security/owner acceptance are recorded. **NO-GO** if a certificate is untrusted, proxy is bypassed, an unapproved PC enters, or the backend is directly reachable.

## 7. Rollback

If client authentication or any data integrity check fails, immediately **disable LAN ingress at the proxy**, preserve IT logs and Workspace/Audit, and stop the test after users have saved. If the active DB is inconsistent, use the existing IT-managed Recovery Operator procedures—do not edit pointer JSON or replace live database files manually. No changes to Node.js bind address, database schema or normal app functions are authorized by this LAN configuration increment.
