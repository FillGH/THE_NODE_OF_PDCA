# README4IT — THE NODE OF PDCA | Direct Private-IP

**สถานะ: WP-09 Handover Candidate — รอตรวจรับ** ยังไม่อนุญาต Factory Deploy, Final Release, Merge, Official Pilot หรือข้อมูลจริง ต้องมี Owner GO และ IT อนุมัติแยกก่อนเปิด LAN

## 1. IT เตรียม 3 อย่าง

| รายการ | ข้อกำหนด |
|---|---|
| Host | Windows ที่ IT อนุมัติ, Node.js 24.11.0 ตรง Manifest, Local NTFS |
| Network | Assigned private IPv4 ของ Host และ fixed port ที่ IT อนุมัติและ bind ได้จริง |
| Storage | โฟลเดอร์ app ใหม่, config และ data แยกภายนอก app/ZIP; data ว่างสำหรับ Demo เท่านั้น; ACL เฉพาะ IT/บัญชีบริการ |

ใช้ Direct HTTP แบบ Float Monitor: ไม่ต้องมี reverse proxy, DNS, certificate, npm หรือ Registry บน Host; เครื่องลูกข่ายใช้ Edge และ URL เดียวกัน ไม่ต้องติดตั้งอะไรเพิ่ม. **HTTP ไม่เข้ารหัส; Display Name ไม่ใช่ authentication.** IT ต้องจำกัดผู้ใช้/เครื่องจริงและยืนยันข้อมูลที่อนุญาต, ปฏิเสธ guest/VPN/Internet/unapproved clients. หาก policy ต้องใช้ TLS ให้ STOP และกลับไปทบทวน ADR. หยุด/disable Host รุ่นเดิมทั้งหมดก่อนเริ่ม; หนึ่ง canonical data root และหนึ่ง writer ต่อ dataset.

## 2. ตรวจ Package ก่อนเริ่ม

รับ ZIP + SHA-256 sidecar จาก Run/Artifact ที่ Owner อนุมัติหลัง CI ทั้ง Build และ Clean Target ผ่าน; ชื่อ Candidate ไม่ใช่ Release. หากดาวน์โหลด GitHub Artifact ให้แตก wrapper ก่อน. ตรวจ Inner ZIP SHA-256 กับ sidecar และ Approval Record (ไม่ใช่ outer artifact digest). ตัวอย่าง PowerShell โดยแทนชื่อ ZIP ด้วยชื่อที่ได้รับอนุมัติ:

~~~powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\IT-Staging\PDCA-Direct-Windows-CANDIDATE-<SHA>.zip'
~~~

แตก Inner ZIP ไปโฟลเดอร์ใหม่ เช่น C:\PDCA\app. เปิด CMD ใน app:

~~~cmd
node --version
node tools\prebuilt\verify.mjs .
~~~

ต้องได้ v24.11.0 และ PREBUILT VERIFY PASS; manifest source SHA ต้องตรงกับ Approval Record. ถ้าไม่ตรง STOP. ไม่แก้ไฟล์ใน app หลังตรวจ. ไม่ใช้ npm, git clone, หรือ dependency installation บน Host.

## 3. Fresh synthetic installation — หลังได้รับอนุมัติทดสอบเท่านั้น

ตัวอย่าง IP/path/port ไม่ใช่ค่าจริงของโรงงาน. IT สร้าง C:\PDCA\config และ D:\PDCA\data (ว่าง) พร้อม ACL ก่อนรัน. ตรวจว่า IP ถูก assign และ port bind ได้จริง. เปิด CMD ใหม่ใน app โดยไม่มี PDCA_* ambient variables:

~~~cmd
tools\direct\setup.cmd "C:\PDCA\config\host.env" 192.168.1.50 4175 "D:\PDCA\data"
~~~

Setup สร้าง host.env และ IT/Phil keys ครั้งเดียว ไม่สร้าง DB; IT เก็บคีย์อย่างจำกัดสิทธิ์ ห้ามส่งใน chat/screenshots. หาก setup ซ้ำ ใช้เฉพาะ path config เพื่อ preview ไม่เขียนทับ. หากมีฐานเดิม **ห้าม Seed**; อ่าน [Migration](deployment/DIRECT_PRIVATE_IP_CANDIDATE.md#4-migration--laptop-to-dedicated-server).

ใน CMD แยก (ไม่ load host.env) ที่ app:

~~~cmd
set "PDCA_DEMO_DIR=D:\PDCA\data"
node demo\demo.mjs seed --existing-empty
~~~

ปิด CMD นี้เมื่อเสร็จ. ถ้า seed ไม่สำเร็จ STOP ห้าม retry ทับข้อมูลบางส่วน. ใน CMD ใหม่ที่ app:

~~~cmd
tools\recovery\recovery-menu.cmd "C:\PDCA\config\host.env"
~~~

กรอก IT key แบบซ่อนข้อความ → 3 ADOPT → พิมพ์ ADOPT → 1 Status (ตรวจ pair/cut/projects) → 0 Exit. ทุกขั้นต้องสำเร็จ; ห้ามแก้ Active Pointer เอง.

~~~cmd
tools\direct\diagnose.cmd "C:\PDCA\config\host.env"
tools\direct\start.cmd "C:\PDCA\config\host.env"
~~~

Diagnose ตรวจ path ไม่ใช่ full integrity; Status เป็น integrity check. เปิด URL ที่ Start แสดงใน Edge ของ Host และเครื่องที่ IT อนุญาตหลัง IT ยืนยัน network scope. ตัวอย่าง http://192.168.1.50:4175. ใช้ข้อมูลสมมติ. Ctrl+C เพื่อหยุดและยืนยัน process จบก่อน maintenance; ไม่เปิด Host ซ้ำ. สำหรับ service/task scheduler ให้ IT ใช้ Start CMD กับ absolute host.env, working directory app, บัญชีบริการ ACL และทดสอบ reboot/backup; ไม่เปิด auto-restart ระหว่าง recovery.

## 4. งานประจำและเหตุขัดข้อง

| งาน | วิธี |
|---|---|
| ตรวจ Status / Backup | Recovery Menu 1 / 2; ดู operations.jsonl และ backup-verified |
| Backup | อัตโนมัติเมื่อเริ่ม Host และทุก 2 ชั่วโมงขณะเปิด, retention 30 วัน; IT จัด off-host copy ที่สอดคล้องกัน |
| Restore | หยุด/disable writer; Menu 4 → 5 → ตรวจรายงาน → 6 ACTIVATE เฉพาะเมื่อคู่ข้อมูลตรง |
| Rollback | Menu 7 เฉพาะเมื่อไม่มีงานเขียนหลัง cutover และผ่านการตรวจ; ถ้าปฏิเสธ STOP |
| Deletion Audit | Menu 9 เฉพาะ IT ขณะ Host หยุด |
| ย้าย Laptop → Server / กู้ / ย้อนรุ่น | [คู่มือ IT โดยละเอียด](deployment/DIRECT_PRIVATE_IP_CANDIDATE.md) |

ห้ามแก้ DB/Pointer ด้วยมือ, ลบไฟล์ .pdca-host-exclusion.sqlite, copy DB ระหว่าง writer ทำงาน, เปิด legacy runtime คู่กัน หรือใช้ ACTIVATE-RECOVERY โดยไม่อนุมัติ Recovery Point และความสูญเสียที่อาจเกิด.

## 5. IT acceptance ก่อนใช้งานจริง

- [IT Network Acceptance IT-N01–N14](deployment/IT_NETWORK_ACCEPTANCE_PHASE0.md): endpoint, authorization, HTTP risk, ACL, operational owner.
- [Factory V-01–V-08](design/PILOT_VERIFY.md): multi-PC, collaboration, F-07, backup/restore; RPO ≤4 h, RTO ≤1 working day ตามเงื่อนไขที่ยืนยันได้.
- [Technical appendix](deployment/PREBUILT_WINDOWS.md): integrity / recovery safeguards. [PROJECT.md](PROJECT.md) คือ source of truth.

ผล CI ไม่ใช่ Factory PASS. IT บันทึกผลจริงและผู้รับผิดชอบในพื้นที่ภายใน; ห้ามส่ง IP จริง, secret, ฐานข้อมูลหรือ log บริษัทไป public repo. หากข้อบังคับไม่ผ่านหรือไม่มีหลักฐานให้ STOP. คู่มือ proxy เดิมเป็น Historical Reference เท่านั้น.
