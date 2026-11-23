# Prebuilt Windows Package — Technical Appendix

**IT เริ่มจาก [README4IT.md](../README4IT.md) ก่อนเสมอ** — ไฟล์นี้มีรายละเอียดทางเทคนิคเพื่อใช้ตรวจสอบความถูกต้องและจัดการ Failure ไม่ใช่ชุดคำสั่งติดตั้งที่ IT ต้องอ่านตั้งแต่ต้น

**สถานะ:** Implementation ผ่าน Windows CI ตาม GitHub Workflow ของ Commit ที่บรรจุใน Artifact เท่านั้น; ยังต้องผ่าน IT Review และ Factory LAN V-01..V-08. Source of Truth = [PROJECT.md](../PROJECT.md).

## 1. Packaging Provenance & Dependency Boundary

- `.github/workflows/prebuilt-windows.yml` ใช้ Windows Server 2022, Node.js 24.11.0, `npm ci` ตาม `package-lock.json` และ `npm test`. ขั้นตอนนี้เกิดใน Build Runner ไม่ใช่ Factory Server
- `tools/prebuilt/package.mjs` สร้าง ZIP จาก Allowlist เท่านั้น: App Source, Web, Demo, Assets, Runtime `node_modules`, Root README, README4IT, ชุดตรวจ Runtime/Recovery และเอกสาร IT ที่จำเป็น
- `DEPLOYMENT_MANIFEST.json` มี Source SHA, Platform/Architecture, Node Version, Locked Dependency Metadata, SHA-256 และ Size ของไฟล์ทุกตัว; `*.zip.sha256` ตรวจความถูกต้องระดับ Archive
- Independent Windows Runner **ไม่มี Repository Checkout และไม่ใช้ `npm ci`**: ดาวน์โหลด ZIP, ตรวจ SHA-256/Manifest, แกะ ZIP, เริ่ม Demo ด้วย `node`, ตรวจ Session/Export/Restart Persistence, และรัน `test/recovery-operator.test.js` จาก ZIP
- เฉพาะ Artifact ชื่อ `PDCA-Prebuilt-Windows-Verified` หลัง CI ทั้งสอง Job PASS จึงใช้เสนอ IT Review ได้; `pdca-prebuilt-candidate` ยังไม่ผ่าน Gate
- SHA-256 ตรวจ Integrity ไม่ได้ยืนยันผู้ส่งเอง ต้องเทียบ Source Commit กับ GitHub Actions Run และ IT Approval Record

## 2. Runtime / Service Boundary

- Windows Host ต้องมี Node.js 24.x และ Permission ที่ IT อนุญาต; ไม่ต้องติดต่อ npm Registry หรือรัน npm เมื่อใช้ Prebuilt ZIP ที่ตรวจแล้ว
- Web App รันแบบ Single Writable Host บน `127.0.0.1:PDCA_PORT`; LAN Client ใช้ IT-managed HTTPS Reverse Proxy บน Host เดียวกันเท่านั้น
- Proxy ต้องตรวจการอนุญาตและถอนสิทธิ์ และลบ `x-pdca-ingress-key` และ `x-pdca-operator-key` จาก Client ก่อนใส่เฉพาะ Key ที่ IT เป็นเจ้าของ
- Workspace, Audit, Backup, Restore Staging, Operations Log, Env Keys และ Active Pointer เป็น **Runtime Data นอก ZIP**; ใช้ Local NTFS/ACL ไม่ใส่ Secret หรือข้อมูลจริงลง Repository, ZIP หรือผล Test
- `PDCA_ORIGIN` ต้องเป็น HTTPS Origin ที่ตรงกับ Client (DNS หรือ IP + Port ที่ Certificate ถูกต้อง). อนุญาตเฉพาะกลุ่มผู้ใช้/อุปกรณ์ที่ IT กำหนด ไม่เปิด Direct Node Port, Internet หรือ VPN ตรง

## 3. Managed Recovery Architecture

**Operator Entry:** `tools/recovery/recovery-menu.cmd "<IT host.env>"` เรียก `recovery-menu.ps1`; PS Script เป็น Logic ที่จำเป็น และไม่ใช่ redundant BAT. CLI เชิงเทคนิคอยู่ที่ `src/ops.js`.

**Authority:** `PDCA_ACTIVE_DB_POINTER` (ไฟล์ `active-db.json` ที่ IT คุม) เป็น Single Selector ของ **Workspace + Audit**. Startup, Offline Status/Inspect, Backup และ Recovery ต้องอ่านคู่เดียวกัน. Config/Pointer ต้องอยู่ภายใต้ `PDCA_DATA_ROOT` และห้ามแก้ Pointer ด้วยมือ

**ขั้นตอน:** `ADOPT → Status → List Backup → Restore to Staging → Review restore.json → IT Prepare → ACTIVATE / ACTIVATE-RECOVERY → Restart & Verify → Optional ROLLBACK`

- `ADOPT` ตรวจคู่ Workspace/Audit, สร้าง Pointer และปรับ Witness ข้าม SQLite ทั้งสองไฟล์ให้เป็น Baseline ของชุด Active ใหม่ ต้องทำขณะ Server ปิด
- `RESTORE` คัด Snapshot ไปยัง Staging ตรวจ Checksum และ Reconcile เหตุการณ์จาก Audit ที่มี Ledger/Sequence/Head ตรงกัน; `held` หมายถึง **ไม่ผ่าน**
- `PREPARE` สำหรับ IT เท่านั้น สร้าง `candidate.sqlite` และ `preview-audit.sqlite` ด้วย SQLite Online Backup ของ Audit. Reseal Witness เฉพาะคู่ Preview ใน Staging; **ห้ามใช้ Live Audit คู่กับ Preview Candidate** และห้าม Activate โดยอัตโนมัติ
- `ACTIVATE` จะผ่านก็ต่อเมื่อ Candidate มี **Full Inventory** ตรงกับ Live Workspace/Audit รวมถึง Graph Edits และ Conflict Metadata ที่ไม่ได้เพิ่ม Deletion Audit Event. Candidate จะถูก **Promote ไปยัง `PDCA_DATA_ROOT/active-db/.../workspace.sqlite`** นอก Restore Staging ก่อน Reseal Workspace/Audit Witness และเปลี่ยน Pointer
- `ACTIVATE-RECOVERY` เป็นการยอมรับ Recovery Point และความเสี่ยงข้อมูลสูญหายอย่างเจาะจงโดย IT เมื่อ Live แตกต่าง/เสียหาย ต้องตรวจ Snapshot Time, Recent Work, Audit, RPO/RTO และ Record Evidence ก่อนดำเนินการ
- `ROLLBACK` ใช้ได้ต่อเมื่อ Full Inventory ของ Current/Previous ตรงกัน รวมทั้ง `last_save_id`, `scope_versions` และ `save_receipts`; หากมีงานเขียนหลัง Cutover ปฏิเสธและให้ IT ทำ Recovery/Reconciliation แทน. หากผ่านจึง Reseal คู่ Previous/Audit ก่อนสลับ Pointer
- Server Port Guard เป็นเพียงการตรวจ Port ที่ตั้งไว้; IT ยังต้อง Disable Auto-restart, ตรวจว่ามี Single Writer เท่านั้น และไม่แก้ DB Paths/Pointer เพื่อข้ามการป้องกัน

**Audit-specific Limit:** Snapshot มี Workspace + Metadata แต่ไม่มีสำเนา Audit ทั้งชุด ต้องรักษา Latest Authorized Audit จาก Host ที่รับการเขียน ถ้า Audit หาย/ไม่ครบ การ Replay ไม่ถือว่าปลอดภัย ระบบต้องคง Candidate ไว้ใน Staging; ห้ามเปิดไฟล์เก่าโดยเดา

## 4. Downgrade / Rollback STOP Gate

**Source BUILD 4 ก่อนเพิ่ม Active Pointer ไม่รู้จัก `PDCA_ACTIVE_DB_POINTER`** และอาจเปิด `PDCA_DB` เก่าหลังระบบสลับ Candidate แล้ว จึงห้ามติดตั้ง Source รุ่นเก่าทับหรือเปิดผ่าน BAT/Script รุ่นเก่าโดยตรง

Source Rollback และ Database Rollback เป็นคนละขั้นตอน ต้องหยุด Service, Preserve Latest Workspace/Audit, ตรวจข้อมูลเขียนหลัง Cutover (ทั้ง Audit/Non-Audit) และให้ IT อนุมัติ Source Migration + Verified Return Path. หากพิสูจน์ฐานข้อมูลปัจจุบันไม่ได้ให้ STOP ไม่ใช่สลับกลับอัตโนมัติ

## 5. Verification and Acceptance

- **CI Check:** Package Integrity, smoke/local API/JSON-XLSX-PDF, all Node Tests, Recovery Operator Guard Tests, Windows Launcher Usage Guard
- **Factory Acceptance:** [design/PILOT_VERIFY.md](../design/PILOT_VERIFY.md) V-01..V-08, รันบน Windows Factory Host + Authorized/Unauthorized Clients จริง และวัด RPO/RTO ของ Restore Drill จริง
- **NO-GO:** Source/Hash ไม่ตรง, Missing Audit/Pointer, ผู้ไม่รับอนุญาตผ่าน Proxy, Incorrect Active DB, Silent Data Loss, Permission/Restore Failure หรือไม่มีหลักฐาน Recovery

Operational Runbook สำหรับ Detail/Host Migration: [design/BUILD4_HOST_RUNBOOK.md](../design/BUILD4_HOST_RUNBOOK.md). Historical IT Requirements: [design/IT_HANDOFF.md](../design/IT_HANDOFF.md).

## F-01/F-05/F-06 — Data Integrity and Crash Recovery

1. **Permanent Active Storage:** The activated Workspace is located under `PDCA_DATA_ROOT/active-db/release-<stageId>-<serial>/workspace.sqlite`. The staging candidate remains in `PDCA_RESTORE_DIR`; deleting old Restore Staging does not delete Active Workspace. IT MUST preserve the entire active-db directory as operational data, not a temporary staging directory.
2. **Cross-file Mutation Witness:** Legitimate application writes update Workspace and Audit witness generation/token in a single SQLite multi-file transaction, including creates, saves, category changes, trash and purge. On managed Startup/Status, mismatched witness rejects an older Workspace even when Deletion Audit seq/head are unchanged. The witness is not a substitute for off-host backup or an independent forensic ledger.
3. **Full Inventory:** Recovery compares graph, images, history, Trash, revisions, `last_save_id`, `scope_versions`, `save_receipts` and workspace category keys/assignments. Different non-deletion content requires IT-explicit `ACTIVATE-RECOVERY`, never silent rollback.
4. **Cutover crash:** Pointer file replacement cannot be atomically committed alongside two SQLite files. If power fails after resealing candidate+Audit but before the pointer is written, the stale pointer fails closed. IT must STOP, preserve both versions and Audit, re-run Restore/Prepare from a fresh Stage and obtain recovery-point approval. Do not edit Active DB Pointer by hand.
5. **Legacy data enrollment:** Earlier BUILD 4 databases without the witness have no proof of the previous non-Audit history. IT must preserve a verified baseline and migrate on an approved copy before managed adoption; never enable the new mode by blindly pointing at old files.
6. **Acceptance:** Factory V-07 needs evidence for deleting Staging after ACTIVATE, a rejected pre-write Workspace substitution with unchanged deletion ledger, guarded Rollback of post-cutover metadata, and recovery from an interrupted cutover.


## C-01/C-02/C-03 Recovery Hardening — Codex findings

- **C-01:** Managed Startup/Status first invokes SQLite Native Hot Journal Recovery with a writable connection to EXISTING Workspace + Audit (`create:false`, never create missing files), then STRICT read-only SQLite/Workspace/Audit/Witness validation. Missing files, mismatched witness, and substituted stale Workspace remain blocked. No automatic ADOPT or reseal.
- **C-02:** Original pre-Witness Snapshot remains immutable. Following checksum, cutoff, and Audit validation, `prepareRestore()` enrolls any missing Witness table ONLY on isolated `candidate.sqlite` + COPIED `preview-audit.sqlite`. Never mutate original Backup or authoritative Live Audit to permit Preview.
- **C-03:** IT stops all writers and preserves the existing original Workspace/Audit pair. With Active Pointer ABSENT, Menu Option **8 MIGRATE LEGACY COPY** creates and migrates an isolated pair under `PDCA_DATA_ROOT/legacy-upgrade-<UUID>`. IT compares Inventory, then sets external `PDCA_DB`/`PDCA_AUDIT` to approved candidate paths BEFORE ADOPT. No automatic cutover.
- SQLite-native hot journal rollback of an uncommitted transaction is DISTINCT from an interruption between successful cross-file Witness reseal and separate Active JSON Pointer replacement; the latter remains FAIL CLOSED requiring IT-controlled recovery.


### F-07 — Operational Status contention control

IT-only `activeStatus()` retries only SQLite `SQLITE_BUSY` / exact `database is locked` errors from the complete Active Workspace/Audit validation, with a nominal 5,000 ms retry window and 75 ms delay between attempts. Errors outside transient SQLite contention (including witness/ledger mismatch and missing database) are NEVER retried as success. A sustained writer may cause a clear nonzero `BUSY/RETRY` result; this is not proof of corruption and not a verified status. Existing managed Startup, Backup, Restore, and Rollback controls are unchanged. Test with concurrent writes on the target Windows runtime and record the observed latency/failure counts before accepting F-07.

**F-07 target-only refinement:** The administrative Status path also sets a 1,500 ms SQLite-native Busy Timeout on its read-only Integrity Check / application-id connections (supported by Node.js 24.11.0), in addition to the bounded overall retry. Other call sites use the original default timeout. Full `PRAGMA integrity_check`, Audit and Witness checks are unchanged; the heavy-write benchmark must be measured again for both Status completion and writer cost before acceptance.
