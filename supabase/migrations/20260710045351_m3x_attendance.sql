-- ============================================================
-- 출결 기록 — 교사 전용 비공개 (성적 수준 격리). 나이스 공식 출결 아님.
-- 기본은 전원 출석. 예외(결석/지각/조퇴/결과)만 한 행으로 저장한다.
-- 하루 한 학생당 상태 1개(unique student_id, record_date).
-- ============================================================

create table public.attendance_records (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null,
  classroom_id uuid not null,
  record_date  date not null,
  -- absent 결석 | late 지각 | early 조퇴 | result 결과
  type         text not null check (type in ('absent', 'late', 'early', 'result')),
  -- 결석: 병결/체험학습/출석인정/미인정/기타
  -- 지각·조퇴·결과: 질병/인정/미인정
  reason       text not null,
  memo         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (student_id, record_date),
  foreign key (student_id, classroom_id)
    references public.students (id, classroom_id) on delete cascade,
  check (
    (type = 'absent' and reason in ('병결', '체험학습', '출석인정', '미인정', '기타'))
    or (type in ('late', 'early', 'result') and reason in ('질병', '인정', '미인정'))
  )
);

create index attendance_records_cls_date_idx
  on public.attendance_records (classroom_id, record_date);
create index attendance_records_student_idx
  on public.attendance_records (classroom_id, student_id);

create trigger attendance_records_set_updated_at
  before update on public.attendance_records
  for each row execute function app.set_updated_at();

alter table public.attendance_records enable row level security;

create policy "담임 교사 전용" on public.attendance_records
  for all using (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  )
  with check (
    app.is_classroom_teacher(classroom_id)
    and coalesce(auth.jwt() ->> 'app_role', '') <> 'student'
  );

grant select, insert, update, delete on public.attendance_records to authenticated;
grant select, insert, update, delete on public.attendance_records to service_role;
