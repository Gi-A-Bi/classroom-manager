-- ============================================================
-- 빠른 기록 — 기존 student_records(기록카드) 확장
--  * 유형(record_type) + 세부(detail) + 태그(tags) + 갈등 상호연결(peer/link_group)
--  * 메모(content) 선택 입력 가능하게 NOT NULL 해제
--  * 기존 데이터는 전부 '기타 관찰'(observation)로 자동 이관 (컬럼 기본값)
--  * 교사 커스텀 유형(record_types) — 교사 소유
-- 전부 담임 교사 전용(학생·anon 차단). 기존 RLS 정책 그대로 유지.
-- ============================================================

-- 1) student_records 확장
alter table public.student_records
  add column if not exists record_type text not null default 'observation',
  add column if not exists detail text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists peer_student_id uuid references public.students (id) on delete set null,
  add column if not exists link_group uuid;

-- 메모는 선택 입력 (유형만 눌러도 저장)
alter table public.student_records alter column content drop not null;

-- category(상담/관찰/칭찬/기타 CHECK)는 record_type으로 대체 → 제거
-- (컬럼을 지우면 딸린 CHECK 제약도 함께 제거됨. 기존 행은 위 default로 이미 observation)
alter table public.student_records drop column if exists category;

create index if not exists student_records_type_idx
  on public.student_records (classroom_id, record_type, record_date desc);

-- 편집(유형/메모 수정) 허용
grant update on public.student_records to authenticated;

-- 2) record_types — 교사가 추가하는 커스텀 유형 (기본 6종은 앱에 내장)
create table if not exists public.record_types (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  label      text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists record_types_teacher_idx
  on public.record_types (teacher_id, sort_order);

alter table public.record_types enable row level security;

drop policy if exists "교사 본인 유형 전용" on public.record_types;
create policy "교사 본인 유형 전용" on public.record_types
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

grant select, insert, update, delete on public.record_types to authenticated;
grant select, insert, update, delete on public.record_types to service_role;

notify pgrst, 'reload schema';
