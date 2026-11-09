# BUILD 4 · คู่มือสำรอง กู้คืน และย้าย Host

ใช้ข้อมูลสมมติใน BUILD 4 การเปิดบริการบน LAN โรงงาน บัญชีและสิทธิ์จริง การตั้งค่าเครื่อง และการใช้ข้อมูลจริงอยู่ใน VERIFY หลังได้รับอนุมัติแยก เกณฑ์ D-068, D-069, D-106, Closure-04 และ IT-01–IT-06 อยู่ใน [PROJECT](../PROJECT.md) และ [IT handoff](IT_HANDOFF.md)

## ข้อมูลและจุดตัด Audit

- BUILD 3 เก็บผัง JSON, ID ของ Node, รูปเป็น BLOB, History, Trash, revision และใบรับการบันทึกใน SQLite ส่วนลิงก์เอกสารเก็บเป็นค่าที่อ้างถึงปลายทาง ฐานเดิมมี `deletion_audit` ในไฟล์เดียวกัน ให้หยุด BUILD 3 และสำรองไฟล์เดิมก่อนเปิด **สำเนา** ด้วย BUILD 4 ครั้งแรกจะย้าย Audit พร้อม `seq` และข้อมูลเดิมไปยังไฟล์ Audit และเริ่ม ledger ID กับ hash ณ ลำดับสูงสุดที่พบ Backup ก่อน BUILD 4 ไม่มีจุดตัดที่วิธีนี้ยืนยันได้
- `Workspace` กับ `Audit` อยู่คนละไฟล์บนดิสก์เดียวกัน Audit ใช้ `ATTACH` กับ rollback journal แบบ DELETE และ `synchronous=FULL` ทั้งคู่ การเปลี่ยน Trash, การบันทึก Audit และการอัปเดตหัวลำดับ commit หรือ rollback พร้อมกัน ลำดับเพิ่มต่อเนื่องแม้หมดอายุ Audit ตามกฎของ BUILD 3 ค่าที่เปลี่ยนได้เพื่อกำหนดอายุ Audit แยกจากเนื้อหาเหตุการณ์ที่ใช้คำนวณ hash [SQLite multi-file commit](https://sqlite.org/atomiccommit.html#multi_file_commit)
- งาน Backup ใช้ SQLite Online Backup จาก connection แยก จากนั้นกระชับไฟล์สำเนา ตรวจ SQLite และสิ่งที่อ้างใน JSON เช่น Node ID, ปลายเส้น, รูป, History และ Trash จุดตัด `{ledger, seq, head}` อ่านจากสำเนาที่ได้โดยตรง ใช้เวลาเริ่มจับข้อมูลเป็น `capturedAt` เพื่อวัดอายุแบบเผื่อไว้ หาก SQLite เริ่มอ่านใหม่เพราะมีการเขียนระหว่างสำรอง การอัปเดตบน Workspace จะยังตรงกับจุดตัดในไฟล์สำเนา [Node.js SQLite Backup](https://nodejs.org/api/sqlite.html#sqlitedb-backup-api)
- ชุดหนึ่งมี `workspace.sqlite` กับ `snapshot.json` ซึ่งมี ID เวลา จุดตัดและ SHA-256 ตรวจจากไฟล์ที่เปิดอ่านได้จริงก่อนเผยแพร่จากชื่อ `.pending-*` เป็นชื่อชุดสำรอง ตัว Audit ไม่อยู่ใน snapshot Workspace เก็บชุดสำรองบน Host 30 วันนับตามเวลา UTC โดยงานหมุนเวียนทำงานทุกครั้งที่พยายาม Backup ใช้ ACL กับไฟล์ Audit, Backup, staging และ log และใช้ volume NTFS ภายในเครื่องที่ไม่มีการ sync
- เมื่อกู้ ใช้ ledger ID, ลำดับต่อเนื่อง และ hash ที่ต่อจากจุดตัดไปถึงหัว Audit ที่อ่านพร้อมกันใน SQLite การเทียบใช้ ID และลำดับเหตุการณ์ วันลบและวันหมดอายุของ Trash มาจาก Audit เดิม เหตุการณ์ restore ทำให้รายการกลับมามองเห็น เหตุการณ์ purge คัดผังหรือ Node พร้อมรูป เส้น และ History ที่เกี่ยวข้องออก เหตุการณ์ของรายการที่ไม่มีใน snapshot อยู่ในตัวนับ `absent` การกู้ซ้ำเริ่มจาก snapshot ต้นฉบับทุกครั้ง
- Audit ต้องมาจาก Host ล่าสุดที่รับการเขียน ไฟล์ Audit ที่ย้อนทั้งไฟล์โดยสมบูรณ์อาจดูเหมือน ledger ปัจจุบันเมื่อไม่มีหลักฐานภายนอก ให้ IT เทียบกับหัวล่าสุดที่บันทึกไว้และ Workspace ล่าสุดถ้าอ่านได้ หากยืนยันที่มาไม่ได้ ให้เก็บ staging ไว้ การตรวจลำดับ/hash ตรวจพบช่องว่างหรือความเสียหายของข้อมูลหลังจุดตัด ใช้ ACL เพื่อป้องกันการแก้ไขไฟล์และ metadata
- การสำรองเริ่มเมื่อเปิดบริการและทำซ้ำทุก 2 ชั่วโมง เมื่อไม่สำเร็จลองใหม่ใน 5 นาที `operations.jsonl` และ stderr เป็นช่องรับแจ้งจำลองสำหรับผู้ดูแล มี `backup-failed`, `backup-low-space`, `backup-retention-failed` และ `backup-verified` ค่าแจ้งพื้นที่ต่ำเริ่มที่ 1 GiB หรือขนาด Workspace แล้วแต่ค่าใดมากกว่า ให้ IT ตั้งตามขนาดจริงและจัดผู้รับผิดชอบตรวจ log รวมถึงเมื่อ Host หยุดจนไม่มี log ใหม่

## ซ้อมบนเครื่องพัฒนา

ใช้ Node.js 24 เปิด PowerShell ที่ราก worktree สร้างพื้นที่สำหรับข้อมูลสมมติแยกจาก BUILD 3 ตัวอย่างใช้ key สมมติแบบตายตัวสำหรับรอบซ้อมนี้

```powershell
npm.cmd ci
$env:PDCA_DB = Join-Path $PWD '.pdca-dev\owner-build4\workspace.sqlite'
$env:PDCA_PORT = '4173'
$env:PDCA_IT_KEY = 'fictional-it-key-for-build4-only-000000'
$env:PDCA_PHIL_KEY = 'fictional-phil-key-for-build4-only-0000'
npm.cmd start
```

1. เปิด [แอปพัฒนา](http://127.0.0.1:4173) สร้างผังสมมติ เพิ่ม Node สองตัว เส้น รูป และลิงก์ รอ **บันทึกแล้ว** แล้วหยุดและเริ่มโปรแกรมใหม่เพื่อสร้าง snapshot ที่มีผังดังกล่าว ตรวจเวลาและเหตุการณ์ใน `.pdca-dev/owner-build4/operations.jsonl`
2. เปิด PowerShell อีกหน้าที่ราก worktree ตั้ง `PDCA_DB` และสอง key เหมือนด้านบน เลือกชื่อโฟลเดอร์ snapshot ที่ต้องการจาก `.pdca-dev/owner-build4/backups` จากนั้นลอง Delete และ Restore รายการในแอปเพื่อสร้างเหตุการณ์หลัง snapshot ใช้คำสั่งต่อไปนี้ หรือใช้ HTTP `POST /api/operations/restore` พร้อม body `{"snapshot":"<snapshot-id>"}` และ header `x-pdca-operator-key` ของ Phil หรือ IT

```powershell
$env:PDCA_OPERATOR_KEY = 'fictional-phil-key-for-build4-only-0000'
node src/ops.js restore '<snapshot-id>'
$env:PDCA_OPERATOR_KEY = 'fictional-it-key-for-build4-only-000000'
node src/ops.js inspect
```

3. อ่าน `restore.json` ใน `restore/<stageId>` และเทียบ PDCA/Node/เส้น รูป ลิงก์ จำนวนกับ hash ของ History และ Trash สถานะ `awaiting-it-review` คือผ่านการเทียบอัตโนมัติและรอ IT ตรวจรับ ส่วน `held` มีเหตุผลและชุดที่คัดลอกได้ใน staging คำสั่ง offline คืน exit code 2 สำหรับ held และ 1 สำหรับข้อผิดพลาดหรือสิทธิ์ไม่ผ่าน ใช้คำสั่งนี้หลังปิดแอปเมื่อจะทดสอบเปิดชุดที่ตรวจแล้ว

```powershell
node src/ops.js prepare '<stage-id>'
```

4. เปิดทดสอบชุดที่ผ่านในโฟลเดอร์ preview ใหม่ด้วย **สำเนา** `candidate.sqlite` และ **สำเนา** Audit ที่มีจุดตัดตรงกัน ตั้ง `PDCA_DB` กับ `PDCA_AUDIT` ให้ชี้ไปไฟล์ preview ใช้พอร์ตอื่น เช่น 4174 และเริ่ม `npm.cmd start` ตรวจภาพจาก Node ในแอป ถ้าจุดตัดเปลี่ยนระหว่างซ้อมให้กู้ใหม่ขณะหยุดเขียน `prepare` อนุญาตเฉพาะ IT สร้าง candidate ใน staging หลังยืนยัน checksum และว่า Audit ยังอยู่ที่หัวเดิม ส่วนไฟล์ `workspace.sqlite` ที่มาจาก snapshot หรือ staging มีเครื่องหมายกั้นการเปิดเป็นฐานทำงาน
5. ชุดตรวจรับรันด้วย `node --test test/build4.test.js` ตั้ง `PDCA_BUILD4_EVIDENCE` เป็นพาธใต้ `.pdca-dev` หากต้องการเก็บชุดสำรอง ฐานทดสอบ และรายงานการกู้ที่สร้างจาก fixture

## งานตั้งค่าที่ IT ต้องยืนยัน

| รายการ | วิธีและหลักฐาน |
| --- | --- |
| IT-01 LAN | ผูก Node กับ loopback ใช้ HTTPS reverse proxy ของ IT เป็นทางเข้าเดียว กำหนด `PDCA_ORIGIN` ให้ตรงกับ origin ภายนอก และให้ proxy ส่ง Host ตาม origin ตรวจเครื่องและผู้ใช้ตามนโยบายก่อนส่งต่อ ลบ header `x-pdca-ingress-key` และ `x-pdca-operator-key` ที่มาจาก client แล้วใส่ ingress key จาก config ของ proxy ให้ proxy จำกัด Restore และ Audit แยกตามสิทธิ์ที่ตรวจแล้ว ตรวจอนุญาต ปฏิเสธ ถอนสิทธิ์ และปิด Internet/VPN ตรง |
| IT-02 Session | ใช้ Desktop แยกตามแบบ ตรวจเบราว์เซอร์ที่อนุญาต การสิ้นสุด Session, draft และคืนแท็บ หากต้องใช้เครื่องร่วมให้ตกลงมาตรการกับ IT |
| IT-03 Host | ยืนยัน volume, สิทธิ์ของบัญชีบริการ, สภาพเครื่องตอนหลับ/ไฟดับ, การเริ่มโดยไม่มีผู้ล็อกอิน, เวลารอบแรกหลังเปิด และกรณีบริการล้ม ประเมินได้ถึง 360 ชุดต่อ 30 วันถ้าเปิดตลอด บวกพื้นที่ว่างสำหรับสำเนาชั่วคราว, VACUUM และ staging กำหนด `PDCA_LOW_SPACE_BYTES` และผู้รับแจ้งจริง |
| IT-04 ผู้ดูแล | ระบุผู้รับผิดชอบหลัก สำรอง และผู้ดูแลเทคนิค ยืนยันเวลาทำการและการรับช่วง ติดตาม LastTaskResult และเวลา `backup-verified` ล่าสุด ทดสอบว่าผู้ดูแลได้รับและตอบสนองการแจ้งเมื่อเขียนไม่ได้หรือพื้นที่ต่ำ |
| IT-05 Audit | ให้สิทธิ์ไฟล์เฉพาะบัญชีบริการที่ต้องเขียนและ IT ที่ดูแล ตรวจการเก็บหนึ่งปีนับจาก purge ตามนโยบายบริษัท ในแอป API อ่าน Audit ต้องมี Session และการยืนยัน IT แยกจากชื่อผู้ใช้ Phil เริ่มกู้ได้โดยไม่ต้องเห็นเนื้อหา Audit |
| IT-06 Restore | เปลี่ยนการยืนยันสิทธิ์จำลองเป็นตัวตน IT/Phil ที่ IT อนุมัติ ก่อนเปิดใช้จริง จำกัด offline CLI ให้อยู่ในพื้นที่ที่ IT คุมผ่านสิทธิ์ Windows หากบริการล่มให้ IT ใช้ offline CLI บนไฟล์ที่คัดไว้และบันทึกผู้ร้องขอ กำหนดขอบเขตเอกสารตรวจรับ การคง Audit และการเก็บสำเนาเมื่อพบข้อมูลที่ถูก purge |

ตัวอย่างวิธีเริ่มหลัง boot สำหรับ IT พิจารณา ใช้ Task Scheduler `AtStartup` และบัญชีบริการที่ IT อนุมัติ ตัวอย่างด้านล่างแสดง Local Service ให้ตรวจ ACL แยกก่อนเลือกใช้ ใช้ absolute path ไปยัง Node, ไฟล์ config ที่อ่านได้เฉพาะบัญชีบริการ/IT และโค้ดที่ผ่านการตรวจรับ [Task Scheduler trigger](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasktrigger) · [Task principal](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtaskprincipal)

```powershell
# IT ใช้ตัวอย่างนี้หลังอนุมัติและกำหนดสิทธิ์แล้ว
$code = 'C:\PDCA\app'
$node = 'C:\Program Files\nodejs\node.exe'
$config = 'C:\PDCA\config\host.env'
$action = New-ScheduledTaskAction -Execute $node -WorkingDirectory $code `
  -Argument ('--env-file="{0}" "{1}\src\server.js"' -f $config, $code)
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LOCAL SERVICE' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'PDCA-Host' -Action $action -Trigger $trigger -Principal $principal -Settings $settings
```

กำหนดพาธ absolute และแยกไดเรกทอรีสำหรับ `PDCA_DB`, `PDCA_AUDIT`, `PDCA_BACKUP_DIR`, `PDCA_RESTORE_DIR`, `PDCA_OPS_LOG` ตั้งพอร์ตภายในและ origin/ingress key ตาม IT ให้ระบบ log monitor แจ้งผู้ดูแลและตรวจเมื่อไม่มีเหตุการณ์ตามรอบหลัง Host พร้อมใช้งาน ปิด/เปิดเครื่องจริงและทดสอบจากเครื่องที่อนุญาต **ก่อนล็อกอินที่ Host** เก็บเวลาเริ่มแอปและ snapshot รอบแรก [Task settings](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset)

## ซ้อมกู้และย้าย laptop ไป server

1. แจ้งหยุดเขียนและให้ผู้ใช้บันทึกงาน ปิดทางเข้าที่ proxy หยุดบริการและปิด task ต้นทางเพื่อกันการเริ่มใหม่โดยอัตโนมัติ เก็บฉบับต้นทางและบันทึกผู้ควบคุมการสลับ สร้าง snapshot รอบสุดท้ายด้วย `node --env-file="<host.env>" src/ops.js backup` ในบริบท IT และเก็บผล `inspect` กับ SHA-256 ของไฟล์ทั้งคู่หลังหยุดงาน ตรวจว่าไม่มี process เขียนและไม่มี journal ค้าง หากมี journal ให้ IT ตรวจการกู้ของ SQLite ก่อนคัดลอก
2. **กู้จาก snapshot เก่า** เก็บ Workspace ปัจจุบันไว้ข้างกัน ใช้ Audit ล่าสุดในพื้นที่ที่ IT คุม กู้ซ้ำหลังปิดการเขียน ตรวจ `restore.json`, เปิดดูข้อมูลในพื้นที่แยก และให้ IT ยืนยันชุดที่ตรวจแล้วด้วย `prepare` จับคู่ candidate กับ Audit ล่าสุดเดิม ตรวจ `inspect` ซ้ำก่อนเปิดเข้าใช้ หากตรวจไม่ได้ให้คงพื้นที่แยก เก็บหลักฐานล่าสุดและประสาน IT
3. **ย้าย Host โดยรักษาฉบับล่าสุด** คัดลอก Workspace และ Audit ที่หยุดเขียนแล้วเป็นคู่พร้อม snapshots 30 วันที่ยังใช้งานได้และบันทึกการตรวจ เทียบ `inspect` ทั้งสองด้านรวม SHA-256, ID, เส้น, รูป, ลิงก์, History, Trash และจุดตัด เปิดปลายทางในวงแยกก่อนสลับ ตรวจ Float Monitor, ทรัพยากรร่วม และการเข้าจากเครื่องที่อนุญาต/ปฏิเสธ ปิดและกันไม่ให้ต้นทางเริ่มซ้ำก่อนปลายทางเปิดรับเขียน หลังสลับให้ผู้ใช้เริ่ม Session ใหม่
4. **ย้อนกลับหลังสลับ** ปิดทางเข้าและหยุดเขียนที่ server ก่อน ทำ snapshot/ตรวจฉบับล่าสุดที่ server หากมีงานใหม่ให้นำ Workspace **และ Audit ล่าสุด** จาก server กลับ laptop เป็นคู่ เก็บฉบับก่อนสลับและฉบับ server ไว้สำหรับตรวจ เทียบงานใหม่และ Trash พร้อมจุดตัด แล้วจึงสลับเส้นทางกลับ หากอ่านฉบับ server ไม่ได้ ให้คงการหยุดเขียนและประเมินงานใหม่ที่อาจเสียกับ IT/Phil จากจุดกู้ล่าสุดก่อนตัดสินใจเปิดระบบ
5. บันทึกเวลาเกิดเหตุและ `capturedAt` ของ snapshot ที่กู้ได้จริงเพื่อคำนวณ RPO เป้าหมาย ≤ 4 ชั่วโมงเมื่อมี Backup ใช้ได้ วัด RTO ตั้งแต่เริ่มเหตุจนผู้ใช้ที่ได้รับอนุญาตกลับมาใช้งานได้ตามนิยามวันทำการที่ IT ยืนยัน เป้าหมาย ≤ 1 วันทำการเมื่อระบบและผู้ดูแลพร้อม เก็บผล DEV แยกจากผลที่วัดบน Host จริง
