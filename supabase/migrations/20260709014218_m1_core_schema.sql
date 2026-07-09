-- ============================================================
-- M1 핵심 스키마: profiles, academic_years, classrooms, students, posts
-- 설계 원칙 (CLAUDE.md):
--   * 테넌트 격리 — 모든 접근은 RLS로 이중 강제
--   * 학년도 최상위 구조 — 학급은 반드시 학년도에 종속
--   * 개인정보 최소화 — 학생은 번호+닉네임만으로 운영 가능
--   * 역할 4단계 — teacher / student / parent / admin (확장 예약)
-- 학생 인증: 학급코드+번호+PIN → 서버가 커스텀 JWT 발급.
--   JWT 클레임 app_role='student', classroom_id=<uuid> 를 RLS가 검사한다.
-- ============================================================

-- ------------------------------------------------------------
-- 0. 헬퍼 스키마/함수
-- ------------------------------------------------------------
create schema if not exists app;

-- 학생 토큰의 classroom_id 클레임 (학생이 아니면 null)
create or replace function app.student_classroom_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'classroom_id', '')::uuid
  where auth.jwt() ->> 'app_role' = 'student'
$$;

-- ------------------------------------------------------------
-- 1. profiles — 교사 프로필 (auth.users 1:1)
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role         text not null default 'teacher'
               check (role in ('teacher', 'student', 'parent', 'admin')),
  created_at   timestamptz not null default now()
);

-- 가입 시 프로필 자동 생성
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

alter table public.profiles enable row level security;

create policy "본인 프로필 조회" on public.profiles
  for select using (id = auth.uid());

create policy "본인 프로필 수정" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 프로필 생성은 가입 트리거로만. 클라이언트는 조회와 display_name 수정만 가능
-- (role 컬럼은 컬럼 단위 권한으로 변경 차단)
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ------------------------------------------------------------
-- 2. academic_years — 학년도 (교사별)
-- ------------------------------------------------------------
create table public.academic_years (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  year       int  not null check (year between 2000 and 2100),
  name       text not null,                     -- 예: "2026학년도"
  created_at timestamptz not null default now(),
  unique (teacher_id, year),
  unique (id, teacher_id)                       -- classrooms 복합 FK용
);

alter table public.academic_years enable row level security;

create policy "교사 본인 학년도 전체 권한" on public.academic_years
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ------------------------------------------------------------
-- 3. classrooms — 학급 (학년도에 종속)
-- ------------------------------------------------------------
create table public.classrooms (
  id               uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null,
  teacher_id       uuid not null references public.profiles (id) on delete cascade,
  name             text not null,               -- 예: "3학년 2반"
  class_code       text not null unique
                   check (class_code ~ '^[A-Z0-9]{6}$'),
  theme_color      text,
  created_at       timestamptz not null default now(),
  -- 학급의 teacher_id는 반드시 소속 학년도의 소유자와 일치
  foreign key (academic_year_id, teacher_id)
    references public.academic_years (id, teacher_id) on delete cascade
);

create index classrooms_academic_year_idx on public.classrooms (academic_year_id);

alter table public.classrooms enable row level security;

create policy "교사 본인 학급 전체 권한" on public.classrooms
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "학생 소속 학급 조회" on public.classrooms
  for select using (id = app.student_classroom_id());

-- 해당 학급의 담임(소유 교사)인지 검사.
-- security definer: posts/students 정책에서 classrooms RLS를 거치지 않고 판정
create or replace function app.is_classroom_teacher(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = cid and c.teacher_id = auth.uid()
  )
$$;

-- ------------------------------------------------------------
-- 4. students — 학생 명렬 (번호+닉네임+PIN, 실명은 선택)
-- ------------------------------------------------------------
create table public.students (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  number       int  not null check (number between 1 and 99),
  nickname     text not null,
  real_name    text,                            -- 선택 입력
  pin_hash     text not null,                   -- 서버에서 해시 후 저장
  created_at   timestamptz not null default now(),
  unique (classroom_id, number)
);

create index students_classroom_idx on public.students (classroom_id);

alter table public.students enable row level security;

create policy "교사 본인 학급 학생 전체 권한" on public.students
  for all
  using (app.is_classroom_teacher(classroom_id))
  with check (app.is_classroom_teacher(classroom_id));

-- 학생 role의 students 접근 정책은 만들지 않는다 (M1).
-- pin_hash 노출 방지. 학생 로그인 검증은 서버 전용(service_role) 경로로만 수행.

-- ------------------------------------------------------------
-- 5. posts — 알림장/공지
-- ------------------------------------------------------------
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  title        text not null,
  content      text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index posts_classroom_created_idx
  on public.posts (classroom_id, created_at desc);

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function app.set_updated_at();

alter table public.posts enable row level security;

create policy "교사 본인 학급 알림장 전체 권한" on public.posts
  for all
  using (app.is_classroom_teacher(classroom_id))
  with check (app.is_classroom_teacher(classroom_id));

create policy "학생 소속 학급 알림장 조회" on public.posts
  for select using (classroom_id = app.student_classroom_id());

-- ------------------------------------------------------------
-- 6. 역할별 테이블 권한 (행 수준 제한은 RLS가 담당)
--    이 Supabase 버전은 API 역할에 DML 권한을 자동 부여하지 않으므로 명시한다.
--    anon(비로그인)에는 아무 권한도 주지 않는다.
--    학생 커스텀 JWT는 postgres role 'authenticated'로 매핑되고,
--    행 접근은 app_role/classroom_id 클레임 기반 RLS 정책이 제한한다.
-- ------------------------------------------------------------
grant usage on schema app to authenticated, service_role;

grant select, insert, update, delete on public.academic_years to authenticated;
grant select, insert, update, delete on public.classrooms     to authenticated;
grant select, insert, update, delete on public.students       to authenticated;
grant select, insert, update, delete on public.posts          to authenticated;

-- service_role: 서버 전용 경로(학생 PIN 검증 등). RLS 우회 속성 보유
grant select, insert, update, delete
  on public.profiles, public.academic_years, public.classrooms,
     public.students, public.posts
  to service_role;
