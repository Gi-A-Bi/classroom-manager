-- ============================================================
-- 성적 기록 — 교사 전용 비공개 (성적 수준 격리, student_records와 동일 패턴)
-- 과목(subjects) → 평가(assessments: 점수/단계/텍스트) → 결과(assessment_results)
-- 학생·anon 정책/권한 일절 없음. 복합 FK로 타 학급 위조 차단.
-- ============================================================

-- ------------------------------------------------------------
-- 1. subjects — 학급 과목
-- ------------------------------------------------------------
create table public.subjects (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  name         text not null,
  position     int  not null default 0,
  created_at   timestamptz not null default now(),
  unique (classroom_id, name),
  unique (id, classroom_id)
);

create index subjects_classroom_idx on public.subjects (classroom_id, position);

-- ------------------------------------------------------------
-- 2. assessments — 평가 항목
--    kind: score(점수형, max_score 만점) | level(단계형, levels 커스텀) | text(서술)
-- ------------------------------------------------------------
create table public.assessments (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null,
  classroom_id uuid not null,
  title        text not null,
  assess_date  date not null default current_date,
  kind         text not null check (kind in ('score', 'level', 'text')),
  max_score    numeric check (max_score is null or max_score > 0),
  levels       text[],
  created_at   timestamptz not null default now(),
  unique (id, classroom_id),
  foreign key (subject_id, classroom_id)
    references public.subjects (id, classroom_id) on delete cascade,
  check (kind <> 'level' or (levels is not null and array_length(levels, 1) >= 2))
);

create index assessments_subject_idx
  on public.assessments (classroom_id, subject_id, assess_date desc);

-- ------------------------------------------------------------
-- 3. assessment_results — 학생별 결과 (값은 텍스트로 통일 저장)
-- ------------------------------------------------------------
create table public.assessment_results (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  student_id    uuid not null,
  classroom_id  uuid not null,
  value         text not null,
  updated_at    timestamptz not null default now(),
  unique (assessment_id, student_id),
  foreign key (assessment_id, classroom_id)
    references public.assessments (id, classroom_id) on delete cascade,
  foreign key (student_id, classroom_id)
    references public.students (id, classroom_id) on delete cascade
);

create index assessment_results_idx
  on public.assessment_results (assessment_id);
create index assessment_results_student_idx
  on public.assessment_results (classroom_id, student_id);

create trigger assessment_results_set_updated_at
  before update on public.assessment_results
  for each row execute function app.set_updated_at();

-- ------------------------------------------------------------
-- 4. RLS — 담임 교사 전용 + 학생 토큰 이중 차단
-- ------------------------------------------------------------
alter table public.subjects           enable row level security;
alter table public.assessments       enable row level security;
alter table public.assessment_results enable row level security;

create policy "담임 교사 전용" on public.subjects
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

create policy "담임 교사 전용" on public.assessments
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

create policy "담임 교사 전용" on public.assessment_results
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

-- ------------------------------------------------------------
-- 5. 권한 (anon 없음)
-- ------------------------------------------------------------
grant select, insert, update, delete
  on public.subjects, public.assessments, public.assessment_results
  to authenticated;

grant select, insert, update, delete
  on public.subjects, public.assessments, public.assessment_results
  to service_role;
