# THE NODE OF PDCA · VERIFY และ LAN Test

> **เอกสารนี้เป็น Test Plan/Evidence Matrix ไม่ใช่คู่มือติดตั้ง** สำหรับ Direct-IP Prebuilt ZIP ให้เริ่มที่ [README4IT.html](../README4IT.html); หลัง ADOPT ให้ใช้ `tools\direct\start.cmd` พร้อม external host.env เท่านั้นตามคู่มือ IT. ไม่ใช้ Developer/Demo Launcher บน Managed Host.

Baseline ประวัติ BUILD 4: 10 พฤศจิกายน 2026 · ปัจจุบัน Gate III เตรียม Factory synthetic test; ต้องมี IT approval; ไม่มีการส่งมอบหรือเปิด LAN จริงจากเอกสารนี้

เจ้าของโครงการรับ BUILD 4 แล้ว; การเริ่ม Factory LAN Test ต้องมี Owner/IT approval แยกและใช้ข้อมูลสมมติ ใช้ชุดนี้เก็บหลักฐานบน Laptop บริษัทและเครื่องลูกข่ายที่ IT อนุญาต ก่อนพิจารณา Official Pilot และก่อนนำข้อมูลจริงเข้าระบบ [ข้อกำหนดและเกณฑ์ตัดสิน](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/codex/direct-private-ip-implementation/PROJECT.md)

## 1. ชุด Demo ทดสอบ — Verified Prebuilt ZIP เท่านั้น

สำหรับ Factory synthetic verification ให้ IT ใช้ Candidate ZIP ที่ผ่านตรวจรับและได้รับอนุมัติแยกตาม README4IT.html จาก Artifact ที่อนุมัติ เท่านั้น: ตรวจ Manifest อัตโนมัติหลังแตก ZIP, Setup, Seed ใน data root ว่าง, ADOPT, Status, Diagnose และ Start CMD. ไม่ต้อง clone, npm หรือ Registry บน Target. ห้าม seed ซ้ำหรือใช้ Demo Launcher เปิด Managed Host. ขั้นตอน Developer Source Checkout เดิมเก็บไว้ใน Git history และ README ส่วน Developer Local Test เท่านั้น ไม่ใช่ทางเลือกสำหรับ Factory IT. เปิด URL Direct HTTP ที่ Host แสดงจาก Edge ที่ได้รับอนุญาต และบันทึก Candidate source ตาม Manifest และ Approval Record (ไม่ต้องตรวจ ZIP SHA เอง).

| ผังตั้งต้น | สิ่งที่ใช้ตรวจ |
| --- | --- |
| DEMO 01 · ลดรอยบิ่นหลังตัดกระจก | เปิดรูปและเอกสาร C-01 ค้น `UX-PDCA-CUT` ตามข้อความใน Node ไล่เส้นย้อนจาก Result ทดสอบแก้ชื่อและ Export |
| DEMO 02 · ลดการส่งกล่องติดฉลากผิดรุ่น | Action ครบห้าสถานะ งานเกินกำหนดและงานไม่ระบุ PIC/วันครบกำหนด ทดสอบเลือกหลายสถานะ ประวัติ Free Float และกู้จาก Trash |
| DEMO 03 · ลดเวลาหยุดเครื่องสายประกอบ | 200 Nodes, 283 เส้น, 54 Actions ใช้ทดสอบคนแก้พร้อมกัน ย้อนเส้น แผนที่ย่อ และการจัดผัง |

มีหมวด Workspace สมมติสามหมวด กราฟรูปประกอบ เอกสารภายใต้ origin เดียวกับแอป Node ใน Trash และผังสำหรับกู้จาก Trash เอกสารพาธ UNC และ `file:` สมมติใน DEMO 02 ใช้ตรวจการแสดงและคัดลอกพาธ ส่วน IT ใช้พาธทดสอบที่เข้าถึงได้จริงเมื่อจะตรวจสิทธิ์ไฟล์ของบริษัท

`demo.json` ในโฟลเดอร์ข้อมูลระบุ ID ของผัง จำนวน Node/เส้น รูป และ `oldSnapshot` สำหรับซ้อมการเทียบ Audit ผลซ้อมเบื้องต้นอยู่ใน `restore/<stageId>/restore.json` ชุดเก่านี้ตั้งเวลาให้จำลองการ purge ได้ จึงใช้ตรวจการคืนสถานะตาม Audit และใช้ snapshot ใหม่จากรอบ Backup จริงสำหรับวัด RPO

## 2. ต่อ LAN ภายใต้การควบคุมของ IT — Direct Private-IP (ADR-001 rev 2)

ใช้ [README4IT](../README4IT.html) และ [Direct operator guide](../deployment/DIRECT_PRIVATE_IP_CANDIDATE.md) เป็นขั้นตอนติดตั้งและ Recovery เท่านั้น. ไม่ใช้ proxy, DNS, certificate หรือ npm บน Target. หลัง Owner/IT อนุมัติ synthetic test ให้ IT ยืนยัน assigned IP/port, local NTFS/ACL, account/backup owners, HTTP risk and allowed data scope ตาม [IT-N01–N14](../deployment/IT_NETWORK_ACCEPTANCE_PHASE0.md). Host และ approved peer PC เปิด URL Direct เดียวกัน; ทดสอบ denied clients/guest/VPN/Internet/revocation กับหลักฐาน enforcement. ห้ามเปิด LAN หรือใช้ข้อมูลจริงจากผล CI เพียงอย่างเดียว. Task Scheduler ใช้ direct Start CMD + absolute external host.env; หยุด task/manual writer เดิมก่อน maintenance; ตรวจ reboot และ startup backup. HTTP ไม่เข้ารหัส; Display Name ไม่ใช่ authentication.

## 3. ตารางตรวจรับ VERIFY

ใช้ **PASS / FAIL / NOT TESTED / OUT OF SCOPE** ตามหลักฐาน แถวด้านล่างเริ่มที่ **NOT TESTED บนเครื่องบริษัท** การซ้อมบนเครื่องพัฒนาเก็บเป็นหลักฐานแยก

| ตรวจ | วิธีและเกณฑ์ผ่าน | หลักฐาน |
| --- | --- | --- |
| V-01 Host และการตั้งค่า | บันทึก commit SHA, Node, Edge และ Laptop/Windows รุ่นที่ใช้ ทดสอบ Direct HTTP จากเครื่องลูกข่าย Full HD 1920×1080 เปิดแอปได้ก่อนล็อกอินที่ Host และเกิด Backup ตรวจแล้วหลังบูต ทดสอบการกลับมาหลังรีสตาร์ตโดยข้อมูลที่บันทึกแล้วอยู่ครบ | เวลา, task result, log `backup-verified`, snapshot ID |
| V-02 สิทธิ์และเครือข่าย · G-07/G-11 | อนุญาตเฉพาะเครื่องหรือผู้ใช้ที่ IT กำหนด ทดสอบจากเครื่องไม่มีสิทธิ์ LAN, guest, VPN, Internet และหลังถอนสิทธิ์ขณะที่แท็บเปิดอยู่ ลองชื่อซ้ำและ header ปลอมที่ Direct endpoint; ตรวจหน้าแรก ไฟล์รูป API และ remote audit/restore denial | ต้นทางทดสอบที่ระบุด้วยรหัส, URL/HTTP status, หลักฐาน IT enforcement ที่ปิดคีย์และข้อมูลบริษัท |
| V-03 ฟังก์ชันและข้อมูล · G-01–G-04/G-12 | สร้างผังเปล่าและทดสอบชื่อซ้ำแต่ ID ต่างกัน สร้างครบเจ็ดประเภท แก้ชื่อบน Card ค้นชื่อและเนื้อหา เปลี่ยนหมวด ทดสอบเส้นทางเดียวและย้อนกลับ ปฏิเสธเส้นซ้ำ/เข้าตัวเอง/ข้ามผัง ติดภาพ เปิดเอกสาร และยืนยันบันทึกจากอีกเครื่อง ทดสอบ Snap/Free Float, ล็อกขนาด, Auto Arrange, Undo, หมวด Workspace และฟอนต์ | ID ผัง/Node/เส้น, revision, ภาพก่อนและหลัง, ผลเปิดจากเครื่องที่สอง |
| V-04 Action, ประวัติ และ Export · G-03/G-12 | ใช้ DEMO 02 ตรวจเลข Action คงเดิม PIC และ Due Date ว่างได้ เลือกหลายสถานะและตรวจ Overdue ตามเวลาไทย ทดสอบ History/Restore ข้อความ ประเภท และเส้น ดาวน์โหลด PDF, Excel, JSON ด้วยผู้ใช้ที่ IT อนุญาต ตรวจว่ามีเฉพาะผังที่เลือก รูปปรากฏตามแบบรายงานและ JSON อ้างอิงรูป | ID, รายการ History, สรุปไฟล์และผลเทียบ [Export contract](BUILD3_EXPORT_CONTRACT.md) |
| V-05 แก้พร้อมกัน · G-05/G-12 | ใช้ DEMO 03 ให้ผู้ทดสอบราว 10 คนจากเครื่องหรือโปรไฟล์แยกกันแก้ Node คนละใบด้วยข้อความระบุรอบ แล้วเทียบทั้ง 10 รายการจากเครื่องที่สอง ทดสอบแย่งแก้ Node เดียว การสลับแท็บ และการเปลี่ยนเส้นหรือ layout ชนกัน | ตารางผู้ทดสอบ/Node/ข้อความ/เวลา, revision, History และหลักฐานไม่มีการเขียนทับ |
| V-06 หลุด LAN, Session และ Trash | ใช้กรณี C-01–C-11 ทดสอบตัด LAN ขณะมี draft กลับมาเทียบฉบับล่าสุดก่อนยืนยัน ทดสอบสิทธิ์หมด จบ Session คืนแท็บ และกู้ Node/PDCA จาก Trash ให้สัมพันธ์กับเส้นและรูปที่ถูกซ่อน | บันทึกข้อ C ที่ทำจริง สถานะก่อน/หลัง และผลจากอีก Session [ตาราง C-01–C-11](qa/COLLABORATION_ACCEPTANCE.md) |
| V-07 Backup และ Restore · G-09/G-10 | ใช้หลักฐาน Backup รอบแรกและรอบถัดไปประมาณ 2 ชั่วโมง ตรวจอายุเก็บ 30 วันด้วยเวลาจำลอง ตรวจการแจ้งเมื่อ Backup ล้มเหลวหรือพื้นที่ต่ำในพื้นที่แยก และซ้อม Restore ตาม §4 จนเปิด candidate แยกแล้วตรวจข้อมูลได้ | snapshot ID/hash, ผลเทียบ Audit, เวลาที่ใช้วัด RPO/RTO, หลักฐานผู้ดูแลรับแจ้ง |
| V-08 การปฏิบัติการ · G-08 | IT ทวน dependency/ใบอนุญาตและค่าใช้จ่าย อนุมัติพื้นที่และบัญชีบริการ ทวน rollback และซ้อมย้าย Host ตามแผนหากมีเครื่องเป้าหมาย ให้บริการเขียนได้ครั้งละ Host เดียว | รายชื่อผู้รับผิดชอบ, หลักฐานสิทธิ์และดิสก์, ผลย้าย/rollback หรือเหตุผลที่ยังไม่ทดสอบ |

สำหรับ V-05 ให้รันพร้อมกันจริงและจดเวลาใกล้กัน เริ่มจากแก้คนละ Node แล้วค่อยทดสอบชนกัน แยกผลจำลองสองแท็บกับผลจากผู้ใช้ราว 10 คน หากมีเครื่องไม่พอให้บันทึกจำนวนที่ทดสอบจริงและคงเกณฑ์ 10 คนเป็น **NOT TESTED** จนได้หลักฐานตามเงื่อนไข

## 4. ซ้อมกู้และวัด RPO/RTO

ใช้ [Managed recovery / migration](../deployment/DIRECT_PRIVATE_IP_CANDIDATE.md) บนชุดสมมติแยกที่ IT อนุมัติเท่านั้น. สำหรับ planned maintenance ให้ settle/verify committed saves ก่อนปิด access ตามคู่มือ migration 4.1; incident ให้ contain ทันทีตามความเสี่ยง. หยุดและ disable ทุก writer ก่อน maintenance; preserve verified current Workspace/Audit, pointer and backups; use Menu 4/5 then reviewed ACTIVATE or explicitly approved ACTIVATE-RECOVERY. ทดสอบ oldSnapshot/Audit replay และ held หาก Audit หายหรือไม่ครบใน isolated copy; ห้ามเปิด Preview คู่ Live Audit หรือแก้ Pointer. ตรวจ ID, revision, graph, images, Action, history, Trash, inventory, restart และ verified backup; ทำ rollback drill ตามข้อจำกัด. RPO = เวลาเริ่มเหตุ − capturedAt ของ recovery point ที่กู้ได้จริง ≤4 ชั่วโมง; RTO = เวลาเริ่มเหตุถึง authorized user ตรวจบริการที่กู้แล้วได้ ≤1 วันทำการภายใต้ backup/infrastructure ที่พร้อม. จดเวลาจริงและข้อจำกัด; CI ไม่แทน Factory. ถ้าไม่ผ่าน STOP.

## 5. บันทึกผลและตัดสินใจ

คัดลอกแม่แบบต่อไปนี้ไว้ในพื้นที่ของ IT สำหรับแต่ละรอบ กรอกเวลาตาม Asia/Bangkok และใช้รหัสสมมติแทนชื่อผู้ใช้หรือชื่อเครื่องจริงในเอกสารที่จะแชร์นอกทีม

| วันและเวลา | commit SHA | ข้อ V/C/G | ผู้ทดสอบ/เครื่อง | ผล | หลักฐานหรือเหตุผล | ผู้แก้/รอบทดสอบซ้ำ |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | NOT TESTED | | |

เมื่อปิดผล LAN Test และข้อบังคับที่เกี่ยวข้องแล้ว ให้เจ้าของโครงการกับ IT ทวน Hard Gates ก่อนเริ่ม Official Pilot ช่วง Pilot ใช้เวลา 3 วันทำการ มี Cutting & Packing และอีก 1–2 แผนก ใช้ผู้ทดสอบครั้งแรกอย่างน้อย 5 คนและกรณีงานจริงที่ได้รับอนุมัติ 1 ผังต่อแผนก แต่ละคนต้องทำงานสำคัญครบและทำงานทั้งหมดได้อย่างน้อย 80% โดยไม่รับคำแนะนำ ให้ผ่านอย่างน้อย 80% ทั้งภาพรวมและในทุกแผนก คะแนนใช้ง่ายเฉลี่ยอย่างน้อย 4/5 เจ้าของโครงการตัดสิน GO, ปรับแล้วทดสอบซ้ำ หรือ NO-GO จากหลักฐานและการอนุมัติของ IT [เกณฑ์ Pilot และการวัดผล](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/codex/direct-private-ip-implementation/PROJECT.md#9-acceptance-criteria)

## V-07 Addendum — Prebuilt Managed Recovery

หากใช้งาน `PDCA_ACTIVE_DB_POINTER` ให้ IT บันทึกหลักฐานว่า Startup, Status, Backup และ Restore ใช้คู่ Workspace/Audit ตาม Pointer จริงหลัง Restart; ทดสอบ ADOPT, Restore to staging, Prepare, ACTIVATE, ROLLBACK และกรณีปฏิเสธเมื่อ Database หรือ Audit ไม่ตรงกัน รวมถึงกรณีที่มีการแก้ Node/PDCA แต่ไม่เกิด Deletion Audit Event ทั้งนี้ ACTIVATE-RECOVERY ต้องมี IT ยอมรับ Recovery Point และความเสี่ยงข้อมูลสูญหายอย่างชัดเจน ห้ามใช้ผล Automated Test แทน Factory V-07

**Source Rollback Safety Gate (V-08):** ทดสอบและบันทึกว่า Task Scheduler/Start Script จะไม่เรียก Source BUILD 4 รุ่นเก่าที่ไม่รองรับ Active DB Pointer หลัง Managed ACTIVATE; การย้อนรุ่น Source ต้องมีแผน IT ที่รักษาคู่ Workspace/Audit ล่าสุด ทวนแผนข้อมูลใหม่หลัง Cutover และตรวจ Source SHA/Active DB ก่อนเปิดรับผู้ใช้

### V-07 QA Addendum — Witness and Staging

- ทดสอบ Copy Workspace เก่ากลับหลังสร้าง PDCA/แก้ Graph ใหม่โดยไม่มี Deletion Audit Event: `Status` และ Managed Startup ต้องปฏิเสธ, ห้ามสร้าง Backup ใหม่จาก Workspace เก่า
- ทดสอบ Restore → Prepare → ACTIVATE จากนั้นจัดเก็บ/ลบ Staging ตามนโยบาย แล้ว Restart/Backup ต้องใช้งานได้ด้วย Workspace ที่ Promote ไป `active-db/` อย่างถูกต้อง
- ทดสอบ ROLLBACK หลังเปลี่ยน `scope_versions`, `save_receipts` หรือ `last_save_id` ต้องไม่สูญข้อมูลเงียบ; ตรวจค่า Full Inventory และหลักฐานเหตุการณ์
- จำลองการขัดข้องระหว่าง Reseal Witness กับ Pointer Replacement; ต้อง Fail Closed และต้องมี IT-controlled Recovery Plan ไม่แก้ Pointer JSON ด้วยมือ
- บันทึก Node.js Build/Run Version ตาม Manifest; Direct-IP รองรับ stable Windows x64 Node 24.x ตั้งแต่ 24.11.0; CI ของ Candidate ใหม่ทดสอบ 24.11.0 และ 24.14.1. ใช้ Patch ที่ IT อนุมัติและบันทึกผล Revalidation หลังเปลี่ยน Runtime


### V-07 — C-01/C-02/C-03 Compatibility and Fault Injection

- C-01: Kill an uncommitted dual-file SQLite transaction, then confirm native Hot Journal Recovery to the Last Committed State before Strict Audit/Witness checks; missing files and stale substituted Workspace still block Restart.
- C-02: Restore an authentic BUILD 4 pre-Witness Snapshot; PREPARE only on isolated Preview Audit, immutable Source Snapshot and unchanged authoritative Audit; test corruption and mismatch refusals.
- C-03: With all writers stopped and originals secured, migrate a pre-Witness pair to NEW COPIES, verify content, ADOPT using approved candidate paths, and reject migration after Pointer exists.
- Record Source SHA, Node/Windows Version, test evidence, Owner and RPO/RTO; CI success does not establish Factory V-07 acceptance.


### F-07 — Windows Admin Status under concurrent edits

- เรียก IT Status ขณะมี Writer บันทึก PDCA ต่อเนื่องและตรวจว่าผล Status มี Integrity/Witness Verification ครบ; transient SQLite BUSY ต้อง Retry แบบมีขอบเขต ไม่ใช่การยกเว้นการตรวจ
- ทดสอบ SQLite EXCLUSIVE Lock 3.5 วินาทีจาก Process แยก: Status ต้องกลับมา PASS หลัง Lock ถูกปล่อย และไม่มีการสร้าง DB/Audit ใหม่
- ทดสอบ Sustained Heavy Load เกินช่วง Retry: ผลอาจเป็น `BUSY/RETRY` พร้อม Exit Failure อย่างชัดเจน ห้ามรายงานว่า PASS; ตรวจความครบของ Saved PDCAs หลัง Load
- ทดสอบ Workspace/Audit Witness ไม่ตรงและ Unauthorized IT key: ต้อง Fail Closed โดยไม่ถูก Retry ให้ PASS; บันทึก Runtime Version และหลักฐาน Windows Factory แยกจาก CI
