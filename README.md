# Project Starter Development Kit

> **v0.3 — Practical Learning from Android Projects**

A lightweight, risk-based starter for engineering and software projects. It is designed to be reusable across web apps, dashboards, automations, AlgoTrade systems, industrial tools, scripts, and other technical projects without forcing heavyweight process onto small work.

## THE NODE OF PDCA · Pilot package สำหรับ LAN Test

ใช้ PowerShell และ Node.js 24 จากโฟลเดอร์ repo ที่ checkout สาขา `codex/build-increment-4`

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run demo:seed
npm.cmd run demo:start
```

เปิด [Demo บน Laptop](http://127.0.0.1:4175) แล้วใช้ชื่อทดสอบ จะเห็น Demo สามผังพร้อมภาพ เอกสาร ประวัติ และข้อมูลสำหรับซ้อม Trash กับ Restore สร้าง Demo หนึ่งครั้งต่อโฟลเดอร์ แล้วใช้ `demo:start` เพื่อเปิดข้อมูลชุดเดิม

สำหรับ IT ให้เริ่มจาก [คู่มือ VERIFY และ LAN Test](design/PILOT_VERIFY.md) ซึ่งมีขั้นตอน HTTPS proxy, การทดสอบสิทธิ์ การแก้พร้อมกัน การซ้อมกู้ และแบบบันทึกผล ใช้ [คู่มือปฏิบัติการ BUILD 4](design/BUILD4_HOST_RUNBOOK.md) สำหรับ Task Scheduler, Backup, Restore และการย้าย Host

## THE NODE OF PDCA · BUILD ช่วงที่ 4

เปิด PowerShell ใน worktree นี้ด้วย Node.js 24 รัน `npm.cmd ci` แล้ว `npm.cmd start` เปิด [แอปบนเครื่อง](http://127.0.0.1:4173) และใช้ข้อมูลสมมติ การเริ่มบริการจะสร้าง Backup รอบแรกทันที และนัดรอบถัดไปทุก 2 ชั่วโมง ดูรายการที่ตรวจแล้วใน `.pdca-dev/backups` และเหตุการณ์ใน `.pdca-dev/operations.jsonl`

รัน `npm.cmd test` เพื่อตรวจทั้งสี่ช่วง ใช้ [คู่มือ BUILD 4](design/BUILD4_HOST_RUNBOOK.md) สำหรับสิทธิ์จำลอง การเลือก snapshot การตรวจชุดกู้ในพื้นที่แยก และการซ้อมย้าย Host พร้อมทางย้อนกลับ

## THE NODE OF PDCA · BUILD ช่วงที่ 3

ใช้ Node.js 24 ใน worktree นี้ รัน `npm.cmd ci` แล้ว `npm.cmd start` เปิด [แอปบนเครื่อง](http://127.0.0.1:4173) ด้วยชื่อและข้อมูลสมมติ ฐานเริ่มต้นอยู่ใน `.pdca-dev/pdca.sqlite` และกำหนดไฟล์ทดสอบแยกได้ด้วย `PDCA_DB` ใช้ `Ctrl+C` เพื่อหยุดแอป

- **History** เปิดจาก Canvas หรือ Inspector เพื่อดูประวัติและกู้ข้อความ ประเภท หรือเส้น
- **Trash** เปิดจาก Workspaces รายการ Node และ PDCA กู้ได้ภายใน 7 วัน
- **Action Overview** แสดงเฉพาะ Action ในผังที่เปิด คำนวณวันเกินกำหนดตาม Asia/Bangkok
- **Export** ดาวน์โหลด PDF, Excel หรือ JSON จากฉบับที่บันทึก [สัญญาข้อมูล Export](design/BUILD3_EXPORT_CONTRACT.md)

รัน `npm.cmd test` เพื่อตรวจ History, Trash/Audit, วันโรงงาน และไฟล์ Export บนฐานแยก ใช้ PDFKit และ ExcelJS ใบอนุญาต MIT พร้อมฟอนต์ Sarabun ใบอนุญาต OFL ที่รวมไว้ในโครงการ

## THE NODE OF PDCA · BUILD ช่วงที่ 2

เปิด PowerShell ที่โฟลเดอร์สาขานี้ ใช้ Node.js 24 แล้วรัน `npm.cmd start` จากนั้นเปิด [แอปบนเครื่อง](http://127.0.0.1:4173) ใช้ชื่อและข้อมูลสมมติ ฐานข้อมูลเริ่มต้นอยู่ที่ `.pdca-dev/pdca.sqlite` ของโฟลเดอร์นี้ ใช้ `Ctrl+C` เพื่อหยุดแอป

1. เปิดผังเดิมในสองแท็บของโปรไฟล์เดียวกันเพื่อจำลอง A1/A2 และเปิดจากโปรไฟล์ Edge อีกอันเพื่อจำลอง B1 ทั้งสองโปรไฟล์กรอกชื่อซ้ำกันได้ รหัสย่อข้างชื่อแยก Session
2. กด **แก้ในแท็บนี้** แล้วเปิดการ์ดและกด **แก้ Node นี้** ให้ A แก้ Fact และ B แก้ Action ผู้ชมเห็นฉบับที่บันทึกแล้วอัปเดตเอง และเห็นป้ายผู้แก้ ถ้าจะสลับแท็บใน Session เดียวกัน ใช้ **ขอสิทธิ์จากแท็บเดิม** และรับสิทธิ์เมื่อแท็บเดิมคืนแล้ว
3. เมื่อขาดการเชื่อมต่อหรือบันทึกล้มเหลว ใช้ **ตรวจฉบับร่าง** หลังกลับมาออนไลน์ เทียบข้อความกับฉบับล่าสุดแล้วเลือกยืนยันหรือทิ้งฉบับร่าง **จบ Session** ปิดการเข้าถึงฉบับร่างของ Session ทุกแท็บ คำขอที่ส่งก่อนจบอาจบันทึกสำเร็จได้

แอปตรวจอัปเดตประมาณทุก 0.9 วินาทีเมื่อเชื่อมต่อได้ สิทธิ์แท็บและ Node หมดอายุหลังเซิร์ฟเวอร์ไม่ได้รับการต่ออายุประมาณ 20 วินาที Session หมดอายุเมื่อไม่มีคำขอเป็นเวลา 60 นาที ฉบับร่างและโทเค็นอยู่ในหน่วยความจำของแท็บที่ยังเปิดอยู่ในโปรไฟล์เดียวกัน ใช้โปรไฟล์แยกเพื่อจำลองผู้ใช้ต่างคน

รัน `npm.cmd test` สำหรับการตรวจฐานข้อมูล กติกา lock การส่งซ้ำ การถอนสิทธิ์แบบจำลอง และการชนของเส้นหรือตำแหน่ง แอปช่วงนี้เปิดรับเฉพาะบนเครื่องพัฒนา ใช้ขอบเขต IT-01/IT-02 สำหรับการทดสอบสิทธิ์บน Host และอุปกรณ์โรงงานในช่วงที่เกี่ยวข้อง [ตาราง C-01–C-11](design/qa/COLLABORATION_ACCEPTANCE.md) · [ขอบเขตงาน IT](design/IT_HANDOFF.md)

## THE NODE OF PDCA · คู่มือ BUILD ช่วงที่ 1

ทดสอบด้วยข้อมูลสมมติในเครื่องพัฒนา จากโฟลเดอร์นี้เปิด PowerShell แล้วรันคำสั่งต่อไปนี้ด้วย Node.js 24 ไม่ต้องติดตั้งแพ็กเกจเพิ่ม

```powershell
npm.cmd start
```

เปิด [http://127.0.0.1:4173](http://127.0.0.1:4173) ด้วย Edge บนเดสก์ท็อป ใส่ Display Name สมมติ แล้วกด **สร้าง PDCA** ผังเริ่มต้นว่าง ใช้ `Ctrl+C` ใน PowerShell เพื่อหยุดแอป ไฟล์ข้อมูล `.pdca-dev/pdca.sqlite` จะถูกเปิดใช้อีกครั้งเมื่อรันจากโฟลเดอร์เดิม

1. สร้างสองผังชื่อเดียวกัน เทียบ Record ID ใน Workspaces แล้วเปลี่ยนชื่อผังหนึ่ง ใช้ช่องค้นหาชื่อผัง, Title หรือ Content เพื่อเปิดผังหรือ Node ที่ตรงกัน
2. ใช้ **＋ Node** และ **Node Inspector** เพื่อสร้างและแก้ Node เพิ่มรูป PNG, JPEG, GIF หรือ WebP ได้สูงสุด 16 MiB ต่อรูป ลิงก์ HTTP/HTTPS เปิดในแท็บใหม่ ส่วนพาธ LAN และ `file:` แสดงให้คัดลอกไปเปิดใน File Explorer
3. ลากจุดขวาของการ์ดไปที่จุดซ้ายของ Node ปลายทาง หรือใช้ตัวเลือกใน Inspector ใช้รายการ **← รับจาก** เพื่อตามเส้นย้อน ใช้ **Auto Arrange** หรือเข้า **Free Float** แล้วลากการ์ด รอ **บันทึกแล้ว** ก่อนเปิดผังใหม่เพื่อตรวจตำแหน่ง
4. ตรวจสถานะบันทึกในแถบด้านบน หากการบันทึกล้มเหลว ข้อความที่แก้ยังอยู่ในหน้าปัจจุบันและกด **ลองบันทึกอีกครั้ง** ได้ เมื่อทิ้งฉบับร่างแล้วเปิดผังใหม่จะเห็นข้อมูลฉบับที่เก็บสำเร็จล่าสุด

รัน `npm.cmd test` เพื่อตรวจการค้นหา การเปิด SQLite ใหม่ กติกาเส้น การเก็บข้อมูลเมื่อเปลี่ยนประเภท และ History ในไฟล์ทดสอบแยก ชุดทดสอบจำลองความล้มเหลวระหว่างเขียน History แล้วตรวจว่าผัง รูป และประวัติยังอยู่ในฉบับเดิม

Canvas สืบจาก DESIGN v0.10 ที่รับรอง แอปรันบน loopback เท่านั้น ใช้ Node.js 24 และ SQLite ที่มากับ Node จึงเปิดทดสอบได้โดยไม่มีแพ็กเกจเสริมหรือค่าใช้จ่ายใหม่ `node:sqlite` ในรุ่นที่ทดสอบ (24.14.1) แสดง ExperimentalWarning [DESIGN v0.10](https://github.com/FillGH/THE_NODE_OF_PDCA/blob/684bc5006f6dd60f717a3c755da7f68bfe63f430/design/prototypes/DESIGN_v0.10.html) · [ใบอนุญาต Node.js](https://github.com/nodejs/node/blob/v24.x/LICENSE) · [สิทธิ์ใช้งาน SQLite](https://sqlite.org/copyright.html)

## Core principle

**Use engineering judgment to add only the process, code, documentation, and controls that earn their cost.**

The kit standardizes the way a project is thought through, not the technology used to build it.

## Development lifecycle

```text
DEFINE → DESIGN → BUILD → VERIFY → OPERATE → LEARN
```

### DEFINE
Understand the problem, desired outcome, users, constraints, assumptions, and consequences of failure. A valid outcome may be **DO NOT BUILD** when a simpler solution is better.

### DESIGN
Choose scope, trade-offs, solution approach, risks, and acceptance criteria. Use a prototype, mock-up, pseudo-code, simulation, or other concrete preview when it helps resolve uncertainty before expensive implementation.

For **user-facing web apps or other UI-heavy products**, UI/UX refinement belongs in DESIGN by default when late interface changes would cause meaningful rework:

1. Build a lightweight working prototype or preview using representative mock data.
2. Walk through important flows and realistic states (for example, empty content, keyboard open, long content, and Back navigation when relevant).
3. Refine information hierarchy, layout, wording, actions, navigation, and responsive behavior on representative target devices/viewports.
4. Resolve material UI/UX decisions with the owner/user.
5. Record the accepted interaction/UI baseline in `PROJECT.md` or link to the accepted prototype.
6. Only then begin substantial backend, database, authentication, infrastructure, or deployment integration unless that integration is itself required to resolve a material design uncertainty.

The goal is **not pixel-perfect design before coding**. The goal is to avoid paying integration cost while the fundamental interaction model is still changing.

This is a context-specific design technique, not a mandatory phase for non-UI projects.

When persistent data matters, briefly decide who owns it, where it is stored, what delete/uninstall does, and whether backup/restore is needed. Do not require a data matrix for projects without meaningful data-loss risk.

### BUILD
Implement the agreed baseline using the simplest sufficient solution. Avoid speculative features, unnecessary abstractions, and infrastructure without a demonstrated need.

Build in reviewable increments when that reduces rework. For UI-heavy products, implement from the accepted interaction baseline and do not reopen fundamental UI/UX decisions without a concrete requirement, usability finding, or implementation constraint.

An early prototype is not production evidence. Final verification must cover the intended integrated behavior and target environment where those materially affect correctness.

### VERIFY
Use evidence to show that the solution satisfies the acceptance criteria. Evidence may include manual tests, automated tests, backtests, field tests, smoke tests, or user acceptance depending on the project.

A successful build/CI run is not proof of correct behavior on the target device or environment. Report material checks honestly as **PASS / FAIL / NOT TESTED (including owner-deferred) / OUT OF SCOPE**, with concise evidence or reason. An unrun check must never be counted as a pass.

### OPERATE
Consider real-world use: ownership, failure detection, fallback, recovery, backup, maintenance, and support only to the level justified by risk.

### LEARN
Check whether the solution actually improved the original problem. Capture lessons that are likely to be useful again. Once an accepted release is closed, avoid adding features indefinitely: consider a new baseline/version, keep the README current, and archive obsolete supporting material only if useful.

## Core files

Every project created from this template starts with only three required files:

- `README.md` — what the project is and how to use/run it.
- `PROJECT.md` — the engineering source of truth: problem, scope, design, requirements, risks, acceptance criteria, baseline, and changes.
- `AGENTS.md` — working rules for AI coding agents and developers.

Add source-code, test, documentation, or operational folders only when the project actually needs them.

## Two decision gates

### Ready to Build
Before implementation, there should be enough clarity on:

- Problem and desired outcome
- Scope and out of scope
- Important constraints and assumptions
- Chosen design direction
- Acceptance criteria
- Material risks
- For UI-heavy products where interface decisions drive implementation: an accepted UI/UX interaction baseline refined using a representative prototype/preview

The goal is not perfect documentation. The goal is to avoid coding from guesses or integrating expensive infrastructure while fundamental product interaction is still unsettled.

### Ready to Release
Before real use, confirm that:

- Acceptance criteria pass
- No known critical defect remains
- Material risks are handled appropriately
- The target environment works
- Recovery/fallback exists when the risk justifies it
- The owner/user accepts the result
- Any meaningful unverified/deferred checks and residual risks are visible to the owner, not presented as passed tests

## Risk-based controls

GitHub Issues, branches, pull requests, Codex review, automated tests, CI/CD, monitoring, backup, runbooks, and security review are **optional controls**, not mandatory ceremony.

Add them when risk or complexity makes them worthwhile. Examples:

- Use an **Issue** when work must be tracked beyond the current session, a bug needs follow-up, or a dependency/backlog item must not be lost.
- Use a **Pull Request** when independent review is valuable, multiple people contribute, or regression risk is meaningful.
- Use **Codex review** when correctness, regression, data integrity, or relevant security risk justifies an independent review.
- Use **automated tests** when logic is complex, regression risk is high, or repeated verification makes automation worthwhile.
- Use **monitoring, backup, or a runbook** when failure, data loss, or handover would have meaningful consequences.

## Review finding policy

A review finding is a recommendation, not an automatic requirement. Every actionable finding should end in one of three states:

- **FIX** — relevant to the current baseline and worth correcting now.
- **DEFER** — valid, but not required for the current baseline.
- **REJECT** — outside scope, too hypothetical, or adds more complexity than value.

**Zero review findings is not a project KPI.**

## Starting a new project

1. Create a repository from this template.
2. Replace this README with project-specific usage information when appropriate.
3. Complete `PROJECT.md` enough to pass **Ready to Build**.
4. For UI-heavy web apps/products, prototype and refine the important user flows with representative data before substantial integration.
5. Keep `AGENTS.md` unless the project has a concrete reason to amend it.
6. Build the accepted baseline.
7. Verify the integrated baseline against the acceptance criteria.
8. Add controls only when risk or complexity justifies them.
9. After real use, capture useful lessons and refine the next project rather than adding process automatically.

## Reusable bootstrap prompt

Use a short bootstrap prompt instead of copying the process rules into every ChatGPT conversation. The repository remains the source of truth.

```text
Use Project Starter Development Kit for this project.

Repository:
<owner/repository>

Before proceeding:
1. Inspect the repository.
2. Read README.md, PROJECT.md, and AGENTS.md.
3. Treat PROJECT.md as the Engineering Source of Truth.
4. Follow AGENTS.md as the working rules.
5. Identify the current lifecycle stage:
   DEFINE → DESIGN → BUILD → VERIFY → OPERATE → LEARN
6. Summarize the Current State, unresolved decisions/risks, and Next Action.
7. Continue from the project's actual state rather than restarting the process unnecessarily.
8. If chat instructions conflict with the repository baseline, surface the conflict before changing the baseline.
```

## What changed in v0.3

Two completed Android projects (Body Progress V1.0 and Personal Utilities V1.5a) reinforced a few broadly reusable lessons:

- Exercise relevant real-device UI states early, rather than trusting layout previews alone.
- Consider data ownership and delete/uninstall/recovery behavior only when persistent data warrants it.
- Separate build/CI evidence from target-environment evidence, and label deferred tests honestly.
- Close an accepted release deliberately; keep current documentation accurate and put new features in a future baseline when appropriate.

**Unchanged:** The six-stage lifecycle, three core files, two decision gates, optional risk-based controls, and `FIX / DEFER / REJECT` review policy. No mandatory Android stack, checklist, CI workflow, signing system, or additional file was introduced.

## Pilot rule

This kit is still being refined through real projects. Treat **v0.3** as a pilot revision and promote additional rules only when repeated experience or high-severity evidence shows that they consistently prevent real problems or create clear value.
