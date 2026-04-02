# Presentation Dataset: Class Climate Agent

เอกสารนี้สรุปชุดข้อมูลที่ใช้พรีเซนต์โปรเจกต์ **Class Climate Agent** ให้หยิบไปแนบกับงานหรือใช้เป็น checklist ตอนเตรียมเดโมได้ทันที

## Dataset Bundle

### Preferred single-file bundle

- [supabase/seed/presentation-dataset.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/presentation-dataset.sql)

ไฟล์นี้รวมข้อมูลเดโมหลักทั้งหมดไว้ในไฟล์เดียว ทั้งห้องเรียนหลัก, ห้อง inquiry/pending, ห้อง no-data, นักเรียนที่ลงทะเบียน, ข้อมูล check-in แบบ canonical, และตาราง school calendar สำหรับเดโม

หมายเหตุ: ไฟล์นี้เป็น **domain dataset** ของเดโม และต้องใช้ร่วมกับการ provision บัญชี demo auth ผ่าน Supabase Admin path ก่อน จึงจะ login ด้วย `password123` ได้จริง
ถ้าสภาพแวดล้อมไม่มี `psql` หรือ DB password สำหรับรัน SQL ตรง ๆ สามารถใช้ helper script `npm run demo:seed-presentation` เพื่อโหลด domain dataset ชุดเดียวกันผ่าน service role ได้เช่นกัน

### Core seed files

- [supabase/seed.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed.sql)
- [supabase/seed/seed.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/seed.sql)

### Demo add-ons

- [supabase/seed/school-days-seed.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/school-days-seed.sql)
- [supabase/seed/cs101-pending-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-pending-demo-recommendation.sql)
- [supabase/seed/cs101-inquiry-mode-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql)

## What This Dataset Contains

### Accounts

| Role | Email | Password | Use |
|---|---|---:|---|
| Teacher | `teacher@demo.com` | `password123` | Teacher dashboard, class detail, approvals |
| Student | `student1@demo.com` | `password123` | Student check-in and feedback demo |
| Student | `student2@demo.com` | `password123` | Supporting student account for k-anonymity |
| Student | `student3@demo.com` | `password123` | Supporting student account for k-anonymity |

### Demo Classes in the Single-File Bundle

| Class name | Description | Scenario |
|---|---|---|
| `CS101 Introduction to Computing` | Main demo class for the approval workflow and positive climate trend. | Approved recommendation + healthy 2-week pulse history |
| `gg` | Demo room for inquiry mode and a pending recommendation. | Pending inquiry-mode recommendation + cautious pulse history |
| `กินหมูกระทะ` | No-data demo room used to show privacy-safe empty states. | No check-ins yet |

### Presentation Scenarios Supported

| Scenario | File(s) |
|---|---|
| Full presentation demo | `supabase/seed/presentation-dataset.sql` |
| Basic classroom demo | `supabase/seed.sql` or `supabase/seed/seed.sql` |
| Loop closure / teacher approval | `supabase/seed.sql` + `supabase/seed/cs101-pending-demo-recommendation.sql` |
| Inquiry Mode demo | `supabase/seed.sql` + `supabase/seed/cs101-inquiry-mode-demo-recommendation.sql` |
| Calendar / school-day briefing | `supabase/seed/school-days-seed.sql` |

## Recommended Presentation Package

If you want the simplest dataset that still supports the full clip flow, use:

1. provision demo auth accounts ด้วย `npm run demo:provision-auth`
2. `supabase/seed/presentation-dataset.sql`

If you want to keep using the modular seed files instead, the split bundle is still available below.

## Notes for Presenter

- The base dataset is intentionally privacy-safe and small enough for a live demo.
- `CS101 Introduction to Computing` is the main class used in the clip guide and runbooks.
- `gg` is the inquiry-mode / pending recommendation example.
- `กินหมูกระทะ` is the privacy-safe no-data example.
- The optional recommendation seed files are demo-scoped and are meant to be added only when you want to show approval or inquiry-mode behavior.
- `school-days-seed.sql` supports the morning briefing / calendar logic and is useful when you want to explain scheduling and non-school-day handling.

## Suggested Order When Loading Data

1. Apply the latest Supabase migrations.
2. Provision demo auth accounts ด้วย `npm run demo:provision-auth`
3. If using the single-file bundle, load `supabase/seed/presentation-dataset.sql` only.
4. If using modular seeds, load the base seed first.
5. Load the school days seed if the demo needs calendar context.
6. Load either the pending recommendation seed or the inquiry-mode seed depending on the story you want to tell.

## Short Version for Submission

If the requirement is “source code + dataset”, the dataset can be explained as:

- `supabase/seed/presentation-dataset.sql`
- `supabase/seed.sql`
- `supabase/seed/seed.sql`
- `supabase/seed/school-days-seed.sql`
- `supabase/seed/cs101-pending-demo-recommendation.sql`
- `supabase/seed/cs101-inquiry-mode-demo-recommendation.sql`

These files together cover the teacher login, student check-in, feedback loop, class climate overview, and the approval/inquiry-mode demo paths, with demo auth accounts provisioned separately through Supabase Auth.
