# README4IT — THE NODE OF PDCA

**Windows Prebuilt Deployment + Managed Recovery Operator**

**สถานะ:** สำหรับ **IT Review / Factory LAN Verification ด้วยข้อมูลสมมติ** ยังไม่อนุญาตให้นำข้อมูลจริงมาใช้หรือประกาศ Production Release. IT Security Approval และการตรวจรับ Factory เป็นคนละขั้นกับ CI

## 1. Scope และข้อกำหนดสำคัญ

- **Server:** Windows ที่ IT ควบคุม, Node.js **24.11.0** สำหรับ Artifact ที่ทดสอบรุ่นนี้ (ตรงกับ `build.nodeVersion` ใน Manifest; Node 24 patch อื่นต้องได้รับอนุมัติและทดสอบใหม่), Local NTFS สำหรับ SQLite Workspace/Audit/Backup/Restore; Client ใช้ Desktop Microsoft Edge
- **Installation:** ใช้ ZIP ชื่อ `PDCA-Windows-<source-sha>.zip` จาก Artifact `PDCA-Prebuilt-Windows-Verified` เท่านั้น; บน **Factory Server ไม่ต้องเรียก npm / npm Registry**
- **Network:** Node.js รับเฉพาะ `127.0.0.1:PDCA_PORT`; IT ใช้ **HTTPS Reverse Proxy บน Host เดียวกัน** พร้อมควบคุมผู้ใช้/เครื่องที่ได้รับอนุญาต และป้องกัน Internet/VPN/Direct Port Access. จะใช้ DNS หรือ Server IP + Port ภายนอกก็ต้องเป็น HTTPS Origin ที่ตรงกับ Certificate และ `PDCA_ORIGIN` (ดู Test Plan)
- **Proxy:** คง Host/Origin ให้ถูกต้อง, ลบ `x-pdca-ingress-key` / `x-pdca-operator-key` จาก Client ทุกครั้งและใส่ IT-owned Ingress Key ฝั่ง Proxy เท่านั้น; ห้ามใช้ Display Name ใน PDCA แทนการ Authentication
- **Scope Data:** ข้อมูล Demo เท่านั้นจนผ่าน Gate ที่กำหนด, สำรอง Workspace บน Host ทุก 2 ชั่วโมง/เก็บ 30 วัน, Audit แยกไฟล์; Host-only Backup ไม่ใช่ Off-host Disaster Recovery

## 2. รับและตรวจ ZIP — ทำก่อนติดตั้ง

1. IT รับ `PDCA-Prebuilt-Windows-Verified` จาก GitHub Actions Run ที่ผ่านทั้ง **Build** และ **Clean Windows Runner**. Artifact ที่ดาวน์โหลดจาก GitHub เป็น Wrapper ZIP; แตกเพื่อรับ `PDCA-Windows-<SHA>.zip` และ `*.zip.sha256`
2. ตรวจว่า Source Commit SHA ใน Approval Record, ชื่อ ZIP และ `DEPLOYMENT_MANIFEST.json` ตรงกัน และตรวจ SHA-256 จากไฟล์กำกับ; Hash ไม่ได้พิสูจน์ผู้ส่ง จึงต้องยืนยัน GitHub Run/Source ที่อนุมัติด้วย
3. แตก Inner ZIP ไปยัง **โฟลเดอร์ใหม่** เช่น `C:\PDCA\app`. ห้ามทับ Source ที่กำลังรันหรือโฟลเดอร์ฐานข้อมูลเดิม
4. เปิด PowerShell ในโฟลเดอร์แอปแล้วตรวจ:

~~~powershell
node --version
Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\IT-Staging\PDCA-Windows-<SHA>.zip'
node .\tools\prebuilt\verify.mjs .
node .\tools\prebuilt\smoke.mjs .
~~~

ผลที่คาด: `PREBUILT VERIFY PASS`, `PREBUILT SMOKE PASS` (ใช้ข้อมูลชั่วคราวบน localhost); ถ้าผิดให้ **STOP** ไม่เปิดใช้งานผ่าน LAN

**ภายใน Package:** `README.md`, `README4IT.md`, `DEPLOYMENT_MANIFEST.json`, `src/`, `web/`, `demo/`, `assets/`, `node_modules/`, `tools/prebuilt/`, `tools/recovery/`, `design/` (เฉพาะคู่มือ VERIFY/Recovery), และ `deployment/`

## 3. เตรียม Demo Dataset (ห้ามตั้ง Active Pointer ในช่วง Seed)

IT สร้างโฟลเดอร์ Config/Data **นอก app/ และนอก ZIP**, ให้สิทธิ์ NTFS เฉพาะบัญชีบริการ/IT. ตัวอย่าง `C:\PDCA-LAN-Test\config\demo.env`:

~~~dotenv
PDCA_DEMO_DIR=C:\PDCA-LAN-Test\data\lan-01
PDCA_PORT=4175
PDCA_ORIGIN=https://pdca-test.example.invalid
PDCA_INGRESS_KEY=<IT_Generated_32Plus_Characters>
PDCA_IT_KEY=<Separate_IT_Key_32Plus_Characters>
PDCA_PHIL_KEY=<Separate_Owner_Key_32Plus_Characters>
~~~

ใช้ URL HTTPS จริงที่ IT จัดให้แทน `example.invalid`. สร้าง Key 3 ค่าใหม่ **ไม่ซ้ำกัน** ด้วย Secure Random ในระบบที่ IT ควบคุม; ไม่ใส่ใน GitHub, ZIP หรือ Log. `PDCA_ORIGIN` ต้องตรงกับ URL ที่ Browser ใช้ รวมถึง Port ถ้าไม่ใช่ Port มาตรฐาน

~~~powershell
# Run once for a NEW demo directory; do not reseed over existing data
node --env-file="C:\PDCA-LAN-Test\config\demo.env" demo/demo.mjs seed
node --env-file="C:\PDCA-LAN-Test\config\demo.env" demo/demo.mjs serve
~~~

การรัน Demo ตรงนี้เป็น **ชั่วคราว** สำหรับเตรียมข้อมูลเท่านั้น. หยุดบริการด้วยวิธีที่ IT ควบคุมก่อนเริ่ม Managed Recovery. ห้ามตั้ง `PDCA_ACTIVE_DB_POINTER` ระหว่างใช้ `demo/demo.mjs` เพราะ Demo Launcher จะปฏิเสธ

## 4. เปิด Managed Recovery Mode — ADOPT ครั้งแรก

หลัง Seed เสร็จและหยุด Demo Service ให้ IT สร้าง `C:\PDCA-LAN-Test\config\host.env` แยกจาก `demo.env`. ตัวอย่างค่าต่อไปนี้เป็น **Placeholder**:

~~~dotenv
PDCA_DB=C:\PDCA-LAN-Test\data\lan-01\workspace.sqlite
PDCA_AUDIT=C:\PDCA-LAN-Test\data\lan-01\workspace.sqlite.audit.sqlite
PDCA_DATA_ROOT=C:\PDCA-LAN-Test\data
PDCA_ACTIVE_DB_POINTER=C:\PDCA-LAN-Test\data\active-db.json
PDCA_BACKUP_DIR=C:\PDCA-LAN-Test\data\lan-01\backups
PDCA_RESTORE_DIR=C:\PDCA-LAN-Test\data\lan-01\restore
PDCA_OPS_LOG=C:\PDCA-LAN-Test\data\lan-01\operations.jsonl
PDCA_PORT=4175
PDCA_ORIGIN=https://pdca-test.example.invalid
PDCA_INGRESS_KEY=<IT_Generated_32Plus_Characters>
PDCA_IT_KEY=<Separate_IT_Key_32Plus_Characters>
PDCA_PHIL_KEY=<Separate_Owner_Key_32Plus_Characters>
~~~

**สำคัญ:** `PDCA_AUDIT` ของชุด Demo นี้เป็น `workspace.sqlite.audit.sqlite` ตามฟังก์ชัน `auditPath()`; ตรวจชื่อไฟล์จริงก่อน ADOPT. ทุก Path ใน Managed Mode ต้องเป็น Absolute Path ภายใต้ `PDCA_DATA_ROOT` และอยู่บน Local Storage ที่ IT อนุญาต; ห้ามแก้ Active Pointer ด้วยมือ

1. ตรวจว่าบริการ Node **STOPPED** และ Disable Task Scheduler Auto-restart แล้ว
2. เปิด CMD/PowerShell จากโฟลเดอร์แอป รัน **สคริปต์เดียวสำหรับ IT**:

~~~cmd
tools\recovery\recovery-menu.cmd "C:\PDCA-LAN-Test\config\host.env"
~~~

3. ใส่ IT Operator Key ใน Hidden Prompt เลือก **3 ADOPT** ครั้งแรก และยืนยัน Source Workspace/Audit. ระบบตรวจคู่ไฟล์และสร้าง `active-db.json` แบบ Atomic; **ไม่คัดลอก/เขียนทับฐานข้อมูล**
4. เลือก **1 Status** เพื่อบันทึก Pointer Serial และ Data Cutoff
5. เปิด Managed Host ผ่าน Node (หรือ Task Scheduler ที่ IT กำหนด):

~~~powershell
node --env-file="C:\PDCA-LAN-Test\config\host.env" src/server.js
~~~

หลัง ADOPT ให้ใช้ **Managed Host** เท่านั้น ไม่ใช้ Demo Launcher และไม่แก้ `PDCA_DB` เพื่อสลับฐานข้อมูล

### อัปเกรดฐาน BUILD 4 รุ่นก่อน Witness (C-03) — IT เท่านั้น

สำหรับฐานข้อมูล **เก่าก่อนเพิ่ม workspace_generation** (การติดตั้งใหม่ไม่ต้องทำ):

1. หยุด/Disable Auto-restart ของ Service และยืนยันไม่มี Writer อื่น สำรอง Workspace **และ** Audit ต้นฉบับภายใต้ IT พร้อมตรวจ SQLite/Audit Cutoff, Source SHA และเก็บหลักฐาน
2. ตรวจว่าไฟล์ `PDCA_ACTIVE_DB_POINTER` **ยังไม่มีอยู่** (ห้ามใช้กับระบบ ADOPT แล้ว) ตั้ง `PDCA_DB` และ `PDCA_AUDIT` ใน `host.env` ให้ชี้ไฟล์เดิมภายใต้ `PDCA_DATA_ROOT`
3. เปิด `tools\recovery\recovery-menu.cmd "<host.env>"` เลือก **8 MIGRATE LEGACY COPY**, ยืนยัน `MIGRATE-LEGACY` ด้วย IT Operator Key
4. ระบบสร้าง **สำเนาใหม่** ที่ `PDCA_DATA_ROOT\legacy-upgrade-<UUID>\` และ Migrate Witness **ในสำเนาเท่านั้น**. IT ตรวจ `candidate.workspace` / `candidate.audit`, จำนวน PDCA, Audit Cutoff และข้อมูล เทียบกับต้นฉบับก่อนอนุมัติ
5. **ก่อนสร้าง Pointer** จึงแก้ `PDCA_DB`/`PDCA_AUDIT` ภายในไฟล์ Env ภายนอกให้เป็น Path Candidate ที่อนุมัติแล้ว เลือก **3 ADOPT**, **1 Status**, Restart Managed Host และตรวจ Backup
6. หากตรวจไม่ผ่าน STOP เก็บต้นฉบับไว้ ไม่แก้ Pointer/Copy ทับเพื่อข้ามการตรวจ

**C-01 Hot Journal:** Startup/IT Status อนุญาต SQLite Native Rollback บนไฟล์ Workspace/Audit **ที่มีอยู่แล้ว** ก่อน Strict Integrity/Audit/Witness Validation เท่านั้น ไม่สร้างฐานใหม่หรือเปิดฐานที่ Witness ผิด; ห้ามลบ Journal ด้วยมือ


## 5. Network Test และ Acceptance

ให้ IT ตั้ง HTTPS Reverse Proxy บนเครื่องเดียวกับ Node Host และทดสอบว่า Browser ที่ได้รับสิทธิ์เข้า URL ภายนอกได้ แต่ Browser/Client ที่ไม่ได้รับสิทธิ์ รวมถึงการเชื่อมต่อ Node Port โดยตรงเข้าไม่ได้. `127.0.0.1:4175` เป็น Loopback ภายใน Host เท่านั้น ไม่ใช่ URL สำหรับ Client

ทดสอบ **V-01 ถึง V-08** ตาม [design/PILOT_VERIFY.md](design/PILOT_VERIFY.md): เปิดก่อนล็อกอิน Host, Access Control/Proxy, Node/Graph/Export, ผู้ใช้ประมาณ 10 คนพร้อมกัน, Session/Trash, Backup/Restore Drill และ Rollback/Operations. เก็บ PASS/FAIL/NOT TESTED พร้อมหลักฐาน ไม่ใช้ CI PASS แทน Factory Test

## 6. Backup / Restore / Rollback — ใช้เมนูเดียว

- เมื่อ Managed Host เริ่ม ระบบสำรองทันทีและทำซ้ำทุก **2 ชั่วโมง**; เก็บ Snapshot บน Host **30 วัน**, ถ้าล้มเหลวลองใหม่ใน 5 นาที. ตรวจ `backup-verified` ใน `operations.jsonl` และตรวจ Snapshot จริง
- **Snapshot** เป็น Workspace ที่ตรวจ SHA-256 แล้ว; **Audit** แยกและต้องเป็น Ledger ที่ถูกต้อง/ล่าสุดจาก Host ที่รับการเขียน. ห้ามถือว่าสำรอง Workspace อย่างเดียวเพียงพอสำหรับ Disaster Recovery
- IT เปิด `tools\recovery\recovery-menu.cmd "<host.env>"` → **1 Status → 2 List Backups → 4 Restore to Staging → Review `restore.json` → 5 Prepare** แล้วตรวจ Candidate ในพื้นที่แยก โดยใช้คู่ `candidate.sqlite` + `preview-audit.sqlite` ที่ PREPARE สร้างให้โดยเฉพาะ **ห้ามนำ Candidate Preview ไปจับคู่กับ Live Audit**
- ก่อน **6 ACTIVATE**: หยุดบริการและ Disable Auto-restart, ยืนยัน Candidate/Source/Audit และ Recovery Point. ACTIVATE ปกติจะ Block ถ้าข้อมูล Candidate ไม่ตรง Live; `ACTIVATE-RECOVERY` ใช้ได้เฉพาะเมื่อ IT ยืนยันผลกระทบต่อข้อมูลและยอมรับ Recovery Point อย่างชัดเจน
- เมนู **7 ROLLBACK** จะ Block เมื่อมีข้อมูลใหม่หลัง Cutover (รวมการแก้ไขที่ไม่เกิด Deletion Audit). ห้าม Copy ทับ Workspace/Audit หรือแก้ Pointer ด้วยมือ
- **F-01:** เมื่อ ACTIVATE สำเร็จ ระบบ Copy Candidate ไปยัง `PDCA_DATA_ROOT\active-db\release-<stage-id>-<serial>\workspace.sqlite` ก่อนสลับ Pointer. โฟลเดอร์ `restore\<stage-id>` ยังเป็นหลักฐานและสามารถจัดการอายุตามนโยบายได้โดยไม่กระทบฐาน Active. **ห้ามลบ `active-db` โดยคิดว่าเป็น Staging**
- **F-05:** ทุกการเขียนที่ผ่านระบบจะเปลี่ยน Version Witness ใน Workspace และ Audit พร้อมกัน (รวม Create/Save/Category). หากพบ Database รุ่นเก่า/ไฟล์ถูกแทนที่ Startup, Status และ Backup ภายใต้ Managed Mode จะ Block เพื่อไม่ให้สร้าง Backup ผิดชุด
- **F-06:** การตรวจยืนยันการเปลี่ยนฐานรวม `last_save_id`, `scope_versions`, `save_receipts` และชื่อหมวดภายใน ไม่ใช่เฉพาะ Node/History/Deletion Audit
- **Crash Fail-closed:** ถ้าไฟดับระหว่าง Reseal Witness และเปลี่ยน Pointer จะต้องหยุดบริการเพื่อให้ IT ตรวจและสร้าง Recovery Stage ใหม่ ห้ามแก้ JSON Pointer หรือเปลี่ยน Path โดยมือ
- หากบริการ/ข้อมูลเสียจน Audit ที่ถูกต้องไม่อยู่ ให้ **STOP** และ Escalate IT ไม่บังคับเปิดด้วยฐานข้อมูลเก่า

**ข้อควรระวัง Source Rollback:** Source BUILD 4 รุ่นก่อนมี Active Pointer **ไม่รองรับ `PDCA_ACTIVE_DB_POINTER`**; ห้าม Unzip Source เก่าทับหรือ Start Source เก่าโดยตรงหลัง Activate เพราะอาจเปิดฐานเก่าผิดตัว (บทเรียนจาก Float Monitor). ต้องใช้แผน Source Downgrade ที่ IT อนุมัติและตรวจ Workspace/Audit ล่าสุดก่อนเท่านั้น

สำหรับ Recovery Edge Cases, Approval และการซ้อมย้าย Host ดู [deployment/PREBUILT_WINDOWS.md](deployment/PREBUILT_WINDOWS.md) และ [design/BUILD4_HOST_RUNBOOK.md](design/BUILD4_HOST_RUNBOOK.md)

## 7. STOP/GO Checklist ก่อนส่ง Factory LAN Verification

- [ ] Artifact จาก Approved SHA, ZIP SHA-256/Manifest PASS, Node Version/Architecture ตรง, ไม่มี Secret/Data จริง
- [ ] Local Smoke PASS โดยไม่ใช้ npm, ฟอนต์/Export PDF–XLSX–JSON ทำงาน
- [ ] IT บันทึก ACL, Service Account, Host/Proxy Origin, Key Handling, Allowed/Denied Client Evidence
- [ ] Start/Restart/Backup อ่าน **Active Workspace/Audit คู่เดียวกัน**, ตรวจ Snapshot และ Log ได้
- [ ] Recovery Drill: ADOPT / Restore / Prepare / Activate / Rollback และ Block Conditions ผ่าน พร้อมเวลาวัด RPO/RTO; ทดสอบลบ Staging หลัง Activate แล้วฐาน Active ยังเปิดได้
- [ ] C-01 Crash ระหว่าง Transaction → Hot Journal Recovery → Restart กับ Last Committed Data; Missing DB ยัง BLOCK
- [ ] C-02 Pre-Witness Snapshot → Restore/Prepare/Preview/Activate โดยไม่แก้ Snapshot ต้นฉบับหรือ Live Audit
- [ ] C-03 Legacy Migration บนสำเนา → ADOPT; ต้นฉบับคงเดิม
- [ ] Fault Injection: ย้อน Workspace เก่าโดย Audit Cutoff ไม่เปลี่ยนแล้วระบบต้องปฏิเสธ; ตรวจ Crash ระหว่าง Witness Reseal/Pointer Update โดยไม่เปิดฐานผิดชุด
- [ ] IT ตรวจ Source Rollback / PowerShell Policy / Task Scheduler / Backup Failure Monitoring
- [ ] ทุก Mandatory Gate ใน `PILOT_VERIFY.md` PASS และ Project Owner + IT อนุมัติแยกกัน

**NO-GO:** Checksum ไม่ตรง, ไม่มี Audit, มีการเปิด Unauthorized Client, ชี้ Active DB ผิดชุด, Restore ตรวจไม่ครบ, มีข้อมูลจริงเข้า Test ก่อนอนุมัติ หรือมี Critical Defect ที่ยังไม่ปิด

## 8. ใครอ่านเอกสารใด

| งาน | เอกสาร |
| --- | --- |
| จุดเริ่ม IT / ติดตั้ง / Start / Recovery | **README4IT.md (ไฟล์นี้)** |
| Build/Package/Manifest และ Recovery เชิงลึก | [deployment/PREBUILT_WINDOWS.md](deployment/PREBUILT_WINDOWS.md) |
| Factory LAN Verification และ Evidence | [design/PILOT_VERIFY.md](design/PILOT_VERIFY.md) |
| Backup/Audit Engine, Recovery/Host Migration | [design/BUILD4_HOST_RUNBOOK.md](design/BUILD4_HOST_RUNBOOK.md) |
| Requirements / Hard Gates / Official Pilot | [PROJECT.md](PROJECT.md) |

**ไฟล์ช่วยดำเนินงาน:** มีเพียง `tools/recovery/recovery-menu.cmd` (Launcher) และ `recovery-menu.ps1` (Menu Logic). ทั้งคู่ทำงานร่วมกัน จึงไม่ควรลบตัวใดตัวหนึ่ง. ไม่ต้องเพิ่มไฟล์ Setup/Start BAT เพิ่มเพื่อใช้งาน Prebuilt Package
