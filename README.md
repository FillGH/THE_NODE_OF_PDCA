# THE NODE OF PDCA

**โรงงาน · Internal PDCA Web Application · Desktop Browser**

ระบบจัดการ PDCA แบบ Node และความสัมพันธ์เชื่อมโยง (หลายต่อหลาย) แทนการเก็บข้อมูลหลายประเด็นในเซลล์ Excel เดียว รองรับการไล่เหตุผลจาก Result กลับไปยัง Action, Hypothesis, Fact และ Problem ตลอดจนการทำงานร่วมกันบนข้อมูลชุดเดียวกัน

**สถานะ:** Direct-IP WP-01–09 ผ่านตรวจรับในขอบเขต Engineering/Windows CI; Simplification V0.1 ผ่านตรวจรับ; HTML onboarding candidate อยู่ระหว่างตรวจสอบ. **Factory LAN Verification, Factory Recovery Drill และ Official Pilot ยังไม่ผ่าน/ยังไม่เริ่มตามลำดับ** — ผล CI ไม่ใช่การอนุมัติใช้งานจริง

## ใช้งานอะไรได้บ้าง

- Node 7 ประเภท: Problem, Fact, Assumption / Hypothesis, Action, Status & Result, Measures to be implemented, Link to document
- สร้าง/ค้นหา PDCA และติดตามเส้นเชื่อม, ภาพ, ลิงก์เอกสาร, History, Trash และ Action Overview
- หลาย Session ร่วมกันแก้ไขโดยมี Node Lock, Revision/Conflict Handling, Auto-save และการคืน Draft เมื่อเกิดข้อผิดพลาด
- Export JSON, Excel (.xlsx) และ PDF จากข้อมูลที่บันทึกแล้ว
- SQLite Workspace + Audit แยกไฟล์, Backup อัตโนมัติทุก 2 ชั่วโมงบน Host พร้อม Restore แบบตรวจสอบก่อนสลับ Active DB

การเข้าถึงจากเครื่องอื่นใช้ **Direct HTTP บน assigned private IPv4 และ fixed port ที่ IT อนุมัติ** ตาม ADR-001 revision 2; ไม่ใช้ reverse proxy. HTTP ไม่เข้ารหัส; IT ต้องควบคุม network admission และ data scope ก่อนเปิด LAN. `127.0.0.1` เป็น local test เท่านั้น.

## เริ่มต้นที่เอกสารไหน

| ผู้ใช้งาน / งาน | อ่านที่ |
| --- | --- |
| **IT ติดตั้ง Windows Server / รับ ZIP / Backup–Restore** | **[README4IT.html](README4IT.html)** — จุดเริ่มต้นหลัก |
| Factory LAN Verification / UAT Evidence | [design/PILOT_VERIFY.md](design/PILOT_VERIFY.md) |
| Engineering Baseline / Acceptance / Requirements | [PROJECT.md](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/codex/direct-private-ip-implementation/PROJECT.md) — **Source of Truth** |
| Developer / AI Working Rules | [AGENTS.md](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/codex/direct-private-ip-implementation/AGENTS.md) |
| รายละเอียดการสร้าง ZIP และ Recovery Safeguards | [deployment/PREBUILT_WINDOWS.md](deployment/PREBUILT_WINDOWS.md) |
| Recovery Engine / Host Migration แบบเชิงลึก | [deployment/DIRECT_PRIVATE_IP_CANDIDATE.md](deployment/DIRECT_PRIVATE_IP_CANDIDATE.md) |

**ผู้รับมอบระบบจาก IT:** เปิด **README4IT.html** เปิดไฟล์ HTML ด้วย Edge โดยตรงหลังดาวน์โหลด ไม่ต้องอ่านประวัติ BUILD 1–4 หรือเริ่มจากคำสั่ง npm

## Developer Local Test (ไม่ใช่คำสั่งติดตั้งบน Factory Server)

ต้องมี Node.js **24.x** ใช้ข้อมูลสมมติเท่านั้น:

~~~powershell
npm.cmd ci
npm.cmd test
npm.cmd run demo:seed
npm.cmd run demo:start
~~~

เปิด `http://127.0.0.1:4175` จากเครื่อง Host; Seed ข้อมูลเพียงหนึ่งครั้งต่อ `PDCA_DEMO_DIR` แล้วเรียก `demo:start` เพื่อเปิดชุดเดิม ถ้าเคย Seed แล้วอย่าทำซ้ำบนโฟลเดอร์เดิม

**Factory Server ใช้ Verified Prebuilt ZIP และ Node.js 24 เท่านั้น — ไม่ต้องทำ `npm ci` บน Server** ดูวิธีรับและตรวจ Package ใน [README4IT.html](README4IT.html)

## หลักการควบคุมความเปลี่ยนแปลง

- สถานะ Source/PR/Artifact/Factory Test ต้องแยกจากกัน; Draft PR ไม่ใช่ Release
- Runtime Database, Audit, Backup, Pointer, Environment Keys และ Log ต้องอยู่ภายนอก Source และ ZIP ภายใต้สิทธิ์ IT
- Active DB Pointer ใช้เลือก **Workspace + Audit** คู่ที่ถูกต้อง; Witness ข้ามฐานตรวจป้องกันเปิด Workspace เก่าหลังมีการบันทึกที่ไม่ใช่ Deletion Event; ห้ามย้อนใช้ Source รุ่นก่อน Pointer โดยไม่ทำแผน Downgrade ตาม IT Runbook
- ก่อน Official Pilot ต้องผ่าน Factory LAN V-01 ถึง V-08 และ IT Security/Recovery Acceptance

_โครงการนี้เริ่มจาก [Project Starter Development Kit v0.3](https://github.com/FillGH/project-starter-development-kit) แต่ README นี้อธิบาย THE NODE OF PDCA โดยเฉพาะ ไม่ใช่คู่มือ Starter Kit_
