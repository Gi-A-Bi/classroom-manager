-- ============================================================
-- M3: 업무 관리 모드 — 교사 개인 소유 데이터 (학급·학년도 무관, 전부 비공개)
-- RLS: 본인(teacher_id = auth.uid())만 + 학생 JWT(app_role='student') 이중 차단.
-- anon에는 어떤 권한도 부여하지 않는다.
-- ============================================================

-- 0. 마지막 사용 모드 (로그인 시 진입 모드 결정)
alter table public.profiles
  add column last_mode text not null default 'class'
  check (last_mode in ('class', 'work'));

grant update (last_mode) on public.profiles to authenticated;

-- 정책 조건 공통화: 본인 교사이며 학생 토큰이 아님
create or replace function app.is_owner_teacher(tid uuid)
returns boolean
language sql
stable
as $$
  select tid = auth.uid()
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
$$;

-- ------------------------------------------------------------
-- 1. work_todos — 할 일 (반복: repeat_dow 1=월…7=일, 완료는 last_done_date로 추적)
-- ------------------------------------------------------------
create table public.work_todos (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  due_date       date,
  priority       int  not null default 2 check (priority between 1 and 3),
  repeat_dow     int  check (repeat_dow between 1 and 7),
  done_at        timestamptz,
  last_done_date date,
  created_at     timestamptz not null default now()
);

create index work_todos_teacher_idx on public.work_todos (teacher_id, due_date);

-- ------------------------------------------------------------
-- 2. work_documents — 공문 처리 트래커 (파일 보관 아님)
-- ------------------------------------------------------------
create table public.work_documents (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  received_date date not null default current_date,
  due_date      date,
  status        text not null default 'received'
                check (status in ('received', 'in_progress', 'done')),
  memo          text not null default '',
  link          text,
  created_at    timestamptz not null default now()
);

create index work_documents_teacher_idx
  on public.work_documents (teacher_id, status, due_date);

-- ------------------------------------------------------------
-- 3. work_events — 업무 일정 (연수·출장·회의 등)
-- ------------------------------------------------------------
create table public.work_events (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  category   text not null default '기타'
             check (category in ('연수', '출장', '회의', '평가', '기타')),
  event_date date not null,
  end_date   date check (end_date is null or end_date >= event_date),
  created_at timestamptz not null default now()
);

create index work_events_teacher_date_idx
  on public.work_events (teacher_id, event_date);

-- ------------------------------------------------------------
-- 4. work_links — 자주 쓰는 링크
-- ------------------------------------------------------------
create table public.work_links (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  url        text not null check (url ~ '^https?://'),
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create index work_links_teacher_idx on public.work_links (teacher_id, position);

-- ------------------------------------------------------------
-- 5. RLS + 권한 (네 테이블 동일 패턴)
-- ------------------------------------------------------------
alter table public.work_todos     enable row level security;
alter table public.work_documents enable row level security;
alter table public.work_events    enable row level security;
alter table public.work_links     enable row level security;

create policy "교사 본인 전용" on public.work_todos
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

create policy "교사 본인 전용" on public.work_documents
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

create policy "교사 본인 전용" on public.work_events
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

create policy "교사 본인 전용" on public.work_links
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

grant select, insert, update, delete
  on public.work_todos, public.work_documents, public.work_events, public.work_links
  to authenticated;

grant select, insert, update, delete
  on public.work_todos, public.work_documents, public.work_events, public.work_links
  to service_role;
