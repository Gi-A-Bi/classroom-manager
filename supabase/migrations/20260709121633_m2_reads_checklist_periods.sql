-- ============================================================
-- M2 마무리: 읽음확인(post_reads), 준비물(post_items/item_checks),
--            학급별 교시 수(classrooms.periods_per_day)
-- 학생 "쓰기" 정책 첫 도입: JWT의 student_id 클레임으로 본인 행만 허용.
-- 복합 FK(id, classroom_id)로 다른 학급 알림장/학생에 대한 위조를 DB가 차단.
-- ============================================================

-- ------------------------------------------------------------
-- 1. 학급별 하루 교시 수 (초등 저학년 4 ~ 고등 8)
-- ------------------------------------------------------------
alter table public.classrooms
  add column periods_per_day int not null default 6
  check (periods_per_day between 4 and 8);

-- ------------------------------------------------------------
-- 2. 학생 JWT의 student_id 클레임 (학생이 아니면 null)
-- ------------------------------------------------------------
create or replace function app.student_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'student_id', '')::uuid
  where auth.jwt() ->> 'app_role' = 'student'
$$;

-- ------------------------------------------------------------
-- 3. 복합 유니크: 자식 테이블 FK가 (id + classroom_id) 쌍을 참조하게 하여
--    "다른 학급의 알림장/학생"을 가리키는 행을 만들 수 없게 한다.
-- ------------------------------------------------------------
alter table public.posts
  add constraint posts_id_classroom_key unique (id, classroom_id);
alter table public.students
  add constraint students_id_classroom_key unique (id, classroom_id);

-- ------------------------------------------------------------
-- 4. post_reads — 알림장 읽음 기록
-- ------------------------------------------------------------
create table public.post_reads (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null,
  student_id   uuid not null,
  classroom_id uuid not null,
  read_at      timestamptz not null default now(),
  unique (post_id, student_id),
  foreign key (post_id, classroom_id)
    references public.posts (id, classroom_id) on delete cascade,
  foreign key (student_id, classroom_id)
    references public.students (id, classroom_id) on delete cascade
);

create index post_reads_post_idx on public.post_reads (post_id);

alter table public.post_reads enable row level security;

create policy "교사 본인 학급 읽음 조회" on public.post_reads
  for select using (app.is_classroom_teacher(classroom_id));

create policy "학생 본인 읽음 기록" on public.post_reads
  for insert with check (
    classroom_id = app.student_classroom_id()
    and student_id = app.student_id()
  );

create policy "학생 본인 읽음 조회" on public.post_reads
  for select using (student_id = app.student_id());

-- ------------------------------------------------------------
-- 5. post_items — 알림장 준비물 항목
-- ------------------------------------------------------------
create table public.post_items (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null,
  classroom_id uuid not null,
  label        text not null,
  position     int  not null default 0,
  unique (id, classroom_id),
  foreign key (post_id, classroom_id)
    references public.posts (id, classroom_id) on delete cascade
);

create index post_items_post_idx on public.post_items (post_id, position);

alter table public.post_items enable row level security;

create policy "교사 본인 학급 준비물 전체 권한" on public.post_items
  for all
  using (app.is_classroom_teacher(classroom_id))
  with check (app.is_classroom_teacher(classroom_id));

create policy "학생 소속 학급 준비물 조회" on public.post_items
  for select using (classroom_id = app.student_classroom_id());

-- ------------------------------------------------------------
-- 6. item_checks — 학생별 준비물 체크
-- ------------------------------------------------------------
create table public.item_checks (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null,
  student_id   uuid not null,
  classroom_id uuid not null,
  checked_at   timestamptz not null default now(),
  unique (item_id, student_id),
  foreign key (item_id, classroom_id)
    references public.post_items (id, classroom_id) on delete cascade,
  foreign key (student_id, classroom_id)
    references public.students (id, classroom_id) on delete cascade
);

create index item_checks_item_idx on public.item_checks (item_id);

alter table public.item_checks enable row level security;

create policy "교사 본인 학급 체크 조회" on public.item_checks
  for select using (app.is_classroom_teacher(classroom_id));

create policy "학생 본인 체크 기록" on public.item_checks
  for insert with check (
    classroom_id = app.student_classroom_id()
    and student_id = app.student_id()
  );

create policy "학생 본인 체크 해제" on public.item_checks
  for delete using (student_id = app.student_id());

create policy "학생 본인 체크 조회" on public.item_checks
  for select using (student_id = app.student_id());

-- ------------------------------------------------------------
-- 7. 역할별 권한 (필요한 작업만 최소 부여, 행 제한은 RLS)
--    post_reads: 읽음 취소 개념 없음 → delete 미부여
-- ------------------------------------------------------------
grant select, insert on public.post_reads to authenticated;
grant select, insert, update, delete on public.post_items to authenticated;
grant select, insert, delete on public.item_checks to authenticated;

grant select, insert, update, delete
  on public.post_reads, public.post_items, public.item_checks
  to service_role;
