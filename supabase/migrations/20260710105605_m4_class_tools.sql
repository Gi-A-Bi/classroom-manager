-- ============================================================
-- 학급 도구 서랍 (링크 카드 전용). 교사 개인 소유 = 모든 학급 공통.
-- 카드별 학생 공개 토글(is_student_visible). 학생은 자기 학급 담임의
-- 공개 카드만 조회. anon 전면 차단.
-- ============================================================

-- 학생의 담임 교사 id (학생 토큰의 classroom_id → 담임). security definer.
create or replace function app.student_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.teacher_id
  from public.classrooms c
  where c.id = app.student_classroom_id()
$$;

create table public.class_tools (
  id                 uuid primary key default gen_random_uuid(),
  teacher_id         uuid not null references public.profiles (id) on delete cascade,
  name               text not null,
  url                text not null check (url ~ '^https?://'),
  description        text not null default '',
  color              text not null default 'blue',
  is_student_visible boolean not null default false,
  is_favorite        boolean not null default false,
  position           int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index class_tools_teacher_idx on public.class_tools (teacher_id, position);

create trigger class_tools_set_updated_at
  before update on public.class_tools
  for each row execute function app.set_updated_at();

alter table public.class_tools enable row level security;

-- 교사: 본인 소유 전체 권한 (학생 토큰 차단)
create policy "교사 본인 도구 전체" on public.class_tools
  for all using (
    teacher_id = auth.uid()
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    teacher_id = auth.uid()
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

-- 학생: 자기 학급 담임의 공개 카드만 조회
create policy "학생 담임 공개 도구 조회" on public.class_tools
  for select using (
    is_student_visible = true
    and teacher_id = app.student_teacher_id()
  );

grant select, insert, update, delete on public.class_tools to authenticated;
grant select, insert, update, delete on public.class_tools to service_role;
