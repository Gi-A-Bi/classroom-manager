-- ============================================================
-- M5: 수업 (수업 계획 + 기록) — 교사 전용, 학급 종속
-- 학급(classrooms)에 종속 → 학년도(academic_years)에 자동 종속.
-- 과목은 기존 subjects 테이블 재사용 (별도 테이블 만들지 않음).
-- RLS: 담임 교사 전용 + 학생 토큰 이중 차단 (성적/출결과 동일 패턴).
-- 학생·anon 정책/권한 일절 없음.
-- ============================================================

-- ------------------------------------------------------------
-- lesson_plans — 요일×교시 한 칸 = 하루의 수업 계획/기록 한 행
--   plan_date + period 로 특정 날짜의 특정 교시를 가리킨다.
--   subject_id 는 subjects 재사용(선택). 과목이 지워지면 링크만 끊고 기록은 보존.
--   시간표(timetable_slots)는 격자 배경으로만 쓰고 여기 저장하지 않는다.
-- ------------------------------------------------------------
create table public.lesson_plans (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  subject_id   uuid references public.subjects (id) on delete set null,
  plan_date    date not null,
  period       int  not null check (period between 1 and 8),
  unit         text not null default '',   -- 단원/주제 (선택)
  plan         text not null default '',   -- 계획 내용
  note         text not null default '',   -- 실행 메모 (수업 후, 선택)
  done         boolean not null default false,
  done_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (classroom_id, plan_date, period)
);

create index lesson_plans_week_idx
  on public.lesson_plans (classroom_id, plan_date, period);
create index lesson_plans_subject_idx
  on public.lesson_plans (classroom_id, subject_id, plan_date, period);

create trigger lesson_plans_set_updated_at
  before update on public.lesson_plans
  for each row execute function app.set_updated_at();

-- ------------------------------------------------------------
-- RLS — 담임 교사 전용 + 학생 토큰 이중 차단
-- ------------------------------------------------------------
alter table public.lesson_plans enable row level security;

create policy "담임 교사 전용" on public.lesson_plans
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

-- ------------------------------------------------------------
-- 권한 (anon 없음)
-- ------------------------------------------------------------
grant select, insert, update, delete on public.lesson_plans to authenticated;
grant select, insert, update, delete on public.lesson_plans to service_role;
