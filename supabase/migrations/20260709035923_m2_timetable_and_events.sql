-- ============================================================
-- M2: 시간표(timetable_slots) + 일정(events)
-- RLS 패턴은 M1과 동일: 교사는 자기 학급 전체 권한, 학생은 조회만.
-- ============================================================

-- ------------------------------------------------------------
-- 1. timetable_slots — 요일×교시 시간표 (한 칸 = 한 행)
-- ------------------------------------------------------------
create table public.timetable_slots (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 1 and 5),  -- 1=월 … 5=금
  period       int  not null check (period between 1 and 8),
  subject      text not null,
  created_at   timestamptz not null default now(),
  unique (classroom_id, day_of_week, period)
);

create index timetable_slots_classroom_idx
  on public.timetable_slots (classroom_id, day_of_week);

alter table public.timetable_slots enable row level security;

create policy "교사 본인 학급 시간표 전체 권한" on public.timetable_slots
  for all
  using (app.is_classroom_teacher(classroom_id))
  with check (app.is_classroom_teacher(classroom_id));

create policy "학생 소속 학급 시간표 조회" on public.timetable_slots
  for select using (classroom_id = app.student_classroom_id());

-- ------------------------------------------------------------
-- 2. events — 일정 (학교/학급 레이어 구분)
-- ------------------------------------------------------------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  layer        text not null check (layer in ('school', 'classroom')),
  title        text not null,
  event_date   date not null,
  created_at   timestamptz not null default now()
);

create index events_classroom_date_idx
  on public.events (classroom_id, event_date);

alter table public.events enable row level security;

create policy "교사 본인 학급 일정 전체 권한" on public.events
  for all
  using (app.is_classroom_teacher(classroom_id))
  with check (app.is_classroom_teacher(classroom_id));

create policy "학생 소속 학급 일정 조회" on public.events
  for select using (classroom_id = app.student_classroom_id());

-- ------------------------------------------------------------
-- 3. 역할별 권한 (이 버전은 DML grant 자동 부여 없음)
-- ------------------------------------------------------------
grant select, insert, update, delete
  on public.timetable_slots, public.events
  to authenticated;

grant select, insert, update, delete
  on public.timetable_slots, public.events
  to service_role;
