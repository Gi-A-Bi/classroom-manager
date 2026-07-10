-- ============================================================
-- M3 마무리: 업무 노트·문서 스니펫(교사 개인 소유) +
--            학생별 기록 카드(학급 종속, 민감정보 — 성적 수준 격리)
-- ============================================================

-- ------------------------------------------------------------
-- 1. work_notes — 자유 메모 (태그 분류)
-- ------------------------------------------------------------
create table public.work_notes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  content    text not null default '',
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_notes_teacher_idx
  on public.work_notes (teacher_id, updated_at desc);

create trigger work_notes_set_updated_at
  before update on public.work_notes
  for each row execute function app.set_updated_at();

alter table public.work_notes enable row level security;

create policy "교사 본인 전용" on public.work_notes
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

-- ------------------------------------------------------------
-- 2. work_snippets — 자주 쓰는 문구 템플릿
-- ------------------------------------------------------------
create table public.work_snippets (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  content    text not null,
  created_at timestamptz not null default now()
);

create index work_snippets_teacher_idx
  on public.work_snippets (teacher_id, created_at desc);

alter table public.work_snippets enable row level security;

create policy "교사 본인 전용" on public.work_snippets
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

-- ------------------------------------------------------------
-- 3. student_records — 학생별 기록 카드 (상담·관찰·칭찬)
--    민감정보: 교사 본인 학급만 + 학생 토큰 이중 차단.
--    학생/anon 정책·권한 일절 없음. 복합 FK로 타 학급 학생 위조 차단.
-- ------------------------------------------------------------
create table public.student_records (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null,
  classroom_id uuid not null,
  record_date  date not null default current_date,
  category     text not null default '기타'
               check (category in ('상담', '관찰', '칭찬', '기타')),
  content      text not null,
  created_at   timestamptz not null default now(),
  foreign key (student_id, classroom_id)
    references public.students (id, classroom_id) on delete cascade
);

create index student_records_idx
  on public.student_records (classroom_id, student_id, record_date desc);

alter table public.student_records enable row level security;

create policy "담임 교사 전용" on public.student_records
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

-- ------------------------------------------------------------
-- 4. 권한
-- ------------------------------------------------------------
grant select, insert, update, delete
  on public.work_notes, public.work_snippets
  to authenticated;

grant select, insert, delete on public.student_records to authenticated;

grant select, insert, update, delete
  on public.work_notes, public.work_snippets, public.student_records
  to service_role;
