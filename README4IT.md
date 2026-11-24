# THE NODE OF PDCA — IT Quick Start

**Candidate เท่านั้น:** Direct-IP WP-01–09 ปิดแล้วใน Engineering/Windows CI; Candidate ใหม่ต้องมีผลตรวจรับของตัวเอง. ห้ามเปิด Factory LAN, ใช้ข้อมูลจริง, Pilot หรือ Deploy ก่อน Owner/IT GO แยกต่างหาก.

## 1. เตรียม Host
Windows ที่ IT อนุมัติ, Node.js **24.11.0**, assigned private IPv4 และ fixed port, local NTFS, app directory ใหม่ และ config/data directory แยกนอก app พร้อม ACL เฉพาะ IT/service account. หยุด Host เดิมทั้งหมดก่อนเริ่ม; หนึ่ง writable Host ต่อ dataset.
Direct HTTP ไม่เข้ารหัส; Display Name ไม่ใช่ authentication. IT ต้องยืนยัน client admission/data scope และปฏิเสธ guest/VPN/Internet/unapproved clients. หาก policy ต้องใช้ TLS ให้ STOP. ไม่ต้องใช้ proxy, DNS, certificate, npm หรือ Registry บน Target.

## 2. ตรวจ ZIP และแตกไฟล์
รับ Inner ZIP + SHA-256 sidecar ที่อ้างอิง Owner-approved Candidate/CI; หากเป็น Actions artifact ให้แตก wrapper ก่อน. ตรวจ Hash ด้วย PowerShell (แทนชื่อจริง):
~~~powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\IT-Staging\PDCA-Direct-Windows-CANDIDATE-<SHA>.zip'
~~~
เทียบ sidecar และ Approval Record (ไม่ใช่ outer artifact digest). แตก ZIP ลง app directory ใหม่ เช่น C:\PDCA\app. เปิด CMD ใน app:
~~~cmd
node --version
node tools\prebuilt\verify.mjs .
~~~
ต้องได้ v24.11.0, PREBUILT VERIFY PASS และ manifest source ตรง Approval Record; ไม่ตรงให้ STOP. ไม่แก้ไฟล์ใน app.

## 3. ติดตั้งครั้งแรก (synthetic เท่านั้น)
ตัวอย่าง IP/path/port ไม่ใช่ค่าจริง. IT เตรียม config/data (data ว่าง) พร้อม ACL และตรวจ endpoint bind ได้จริง. CMD ใหม่ใน app ไม่มี PDCA_* ambient variables:
~~~cmd
tools\direct\setup.cmd "C:\PDCA\config\host.env" 192.168.1.50 4175 "D:\PDCA\data"
~~~
Setup สร้าง config/keys ครั้งเดียว ไม่สร้าง DB; เก็บ IT/Phil keys จำกัดสิทธิ์ ไม่ส่งใน chat/screenshots. Setup ซ้ำใช้เฉพาะ path config เพื่อ preview. **มีฐานเดิมห้าม Seed**: ใช้ [Migration §4](deployment/DIRECT_PRIVATE_IP_CANDIDATE.md#4-migration--laptop-to-dedicated-server); missing/corrupt managed pointer ให้ STOP ไม่ใช้ legacy path ข้าม guard.

CMD แยก (ไม่ load host.env):
~~~cmd
set "PDCA_DEMO_DIR=D:\PDCA\data"
node demo\demo.mjs seed --existing-empty
~~~
ปิด CMD; Seed fail ให้ STOP ไม่ retry ทับ partial data. CMD ใหม่ใน app:
~~~cmd
tools\recovery\recovery-menu.cmd "C:\PDCA\config\host.env"
~~~
กรอก IT key แบบซ่อน → 3 ADOPT → พิมพ์ ADOPT → 1 Status (ตรวจ pair/cut/projects) → 0 Exit. ทุกขั้นต้อง PASS.

## 4. เปิดและตรวจ
~~~cmd
tools\direct\diagnose.cmd "C:\PDCA\config\host.env"
tools\direct\start.cmd "C:\PDCA\config\host.env"
~~~
Diagnose ไม่แทน Status integrity check. เปิด URL ที่ Start แสดงใน Edge; peer PC ใช้ URL เดียวกันหลัง IT อนุมัติ network admission. ใช้ synthetic data เท่านั้น. หยุดด้วย Ctrl+C และตรวจว่า process จบก่อน maintenance. Planned stop: settle committed saves/handle drafts ก่อนปิด access; incident ให้ contain ตามความเสี่ยง.

## 5. งานประจำ / Support
- Backup อัตโนมัติ startup/ทุก 2h ขณะ Host เปิด, retention 30 วัน; Host-only ตาม D-046/D-106. Total Host-storage loss อาจกู้ไม่ได้; off-host ตาม IT policy ไม่ใช่ข้อบังคับโครงการ. Menu 1 Status / 2 List, ตรวจ operations.jsonl และ backup-verified.
- Restore, ACTIVATE, rollback, legacy migration, service/task scheduling และ Menu 9: [Direct operator guide](deployment/DIRECT_PRIVATE_IP_CANDIDATE.md). ห้ามแก้ DB/pointer, ลบ host-exclusion lock, copy live SQLite pair หรือเปิด writer ซ้ำ; recovery-point loss ต้องอนุมัติก่อน ACTIVATE-RECOVERY.
- ก่อน Factory/Pilot: [IT-N01–N14](deployment/IT_NETWORK_ACCEPTANCE_PHASE0.md), [V-01–V-08](design/PILOT_VERIFY.md), [Technical appendix](deployment/PREBUILT_WINDOWS.md). RPO ≤4h / RTO ≤1 working day ต้องทดสอบจริงเมื่อ backup/infrastructure ยังอยู่; CI ไม่ใช่ Factory PASS. [PROJECT.md](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/codex/direct-private-ip-implementation/PROJECT.md) คือ source of truth. เก็บหลักฐานในพื้นที่บริษัท; ห้ามส่ง IP จริง, secret, DB หรือ log บริษัทไป public repo.
