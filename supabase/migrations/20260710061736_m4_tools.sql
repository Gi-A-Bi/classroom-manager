-- ============================================================
-- M4 도구 플랫폼 공통 규약
--   tool_configs : 도구별 교사 설정 (비공개, 담임 전용)
--   tool_results : 도구 실행 결과 (학생 공개 토글 is_public)
-- 도구마다 (classroom_id, tool_key) 하나의 현재 설정/결과를 가진다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. tool_configs — 도구 설정 (자리표 배치·조건 등). 학생/anon 전면 차단.
-- ------------------------------------------------------------
create table public.tool_configs (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  tool_key     text not null,
  config       jsonb not null default '{}',
  updated_at   timestamptz not null default now(),
  unique (classroom_id, tool_key)
);

create trigger tool_configs_set_updated_at
  before update on public.tool_configs
  for each row execute function app.set_updated_at();

alter table public.tool_configs enable row level security;

create policy "담임 교사 전용" on public.tool_configs
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

-- ------------------------------------------------------------
-- 2. tool_results — 도구 결과. 교사 전체 권한 + 학생은 공개된 것만 조회.
--    data: 도구별 표준 결과 JSON (자리바꾸기는 좌석 배치)
-- ------------------------------------------------------------
create table public.tool_results (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  tool_key     text not null,
  is_public    boolean not null default false,
  data         jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (classroom_id, tool_key)
);

create trigger tool_results_set_updated_at
  before update on public.tool_results
  for each row execute function app.set_updated_at();

alter table public.tool_results enable row level security;

-- 교사: 자기 학급 도구 결과 전체 권한 (학생 토큰 차단)
create policy "교사 본인 학급 결과 전체" on public.tool_results
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

-- 학생: 자기 학급의 공개된(is_public) 결과만 조회
create policy "학생 소속 학급 공개 결과 조회" on public.tool_results
  for select using (
    classroom_id = app.student_classroom_id()
    and is_public = true
  );

-- ------------------------------------------------------------
-- 3. 권한 (anon 없음). 학생 공개 결과는 학생 JWT(authenticated)로 읽힌다.
-- ------------------------------------------------------------
grant select, insert, update, delete on public.tool_configs to authenticated;
grant select, insert, update, delete on public.tool_results to authenticated;
grant select, insert, update, delete
  on public.tool_configs, public.tool_results to service_role;
