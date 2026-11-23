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

- `ADOPT` สร้าง Pointer หลังตรวจคู่ Workspace/Audit และต้องทำขณะ Server ปิด
- `RESTORE` คัด Snapshot ไปยัง Staging ตรวจ Checksum และ Reconcile เหตุการณ์จาก Audit ที่มี Ledger/Sequence/Head ตรงกัน; `held` หมายถึง **ไม่ผ่าน**
- `PREPARE` สำหรับ IT เท่านั้น สร้าง `candidate.sqlite` จาก Staging ที่ผ่าน; ไม่ Activate โดยอัตโนมัติ
- `ACTIVATE` จะผ่านก็ต่อเมื่อ Candidate มี **Full Inventory** ตรงกับ Live Workspace/Audit รวมถึง Graph Edits ที่ไม่ได้เพิ่ม Deletion Audit Event
- `ACTIVATE-RECOVERY` เป็นการยอมรับ Recovery Point และความเสี่ยงข้อมูลสูญหายอย่างเจาะจงโดย IT เมื่อ Live แตกต่าง/เสียหาย ต้องตรวจ Snapshot Time, Recent Work, Audit, RPO/RTO และ Record Evidence ก่อนดำเนินการ
- `ROLLBACK` ใช้ได้ต่อเมื่อ Full Inventory ของ Current/Previous ตรงกัน; หากมีงานเขียนหลัง Cutover ปฏิเสธและให้ IT ทำ Recovery/Reconciliation แทน
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
