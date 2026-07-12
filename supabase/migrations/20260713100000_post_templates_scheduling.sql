-- ============================================================
-- 알림장 템플릿 + 예약 게시
--  1) post_templates — 교사 소유(모든 학급 재사용). 학생·anon 접근 없음.
--  2) posts.publish_at — 이 시각 이후에만 학생에게 공개. 기본 now()(= 즉시).
--     학생 RLS(posts, post_items)에 publish_at <= now() 를 추가해 예약분 은닉.
-- ============================================================

-- ------------------------------------------------------------
-- 1. post_templates (교사 전용)
-- ------------------------------------------------------------
create table if not exists public.post_templates (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  content    text not null default '',
  items      text[] not null default '{}',   -- 준비물 항목 라벨 배열
  created_at timestamptz not null default now()
);

create index post_templates_teacher_idx
  on public.post_templates (teacher_id, created_at desc);

alter table public.post_templates enable row level security;

drop policy if exists "교사 본인 템플릿 전용" on public.post_templates;
create policy "교사 본인 템플릿 전용" on public.post_templates
  for all using (app.is_owner_teacher(teacher_id))
  with check (app.is_owner_teacher(teacher_id));

grant select, insert, update, delete on public.post_templates to authenticated;
grant select, insert, update, delete on public.post_templates to service_role;

-- ------------------------------------------------------------
-- 2. posts.publish_at — 게시(공개) 시각
--    기존 알림장은 now()로 채워져 즉시 공개 상태가 된다(하위 호환).
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists publish_at timestamptz not null default now();

create index if not exists posts_classroom_publish_idx
  on public.posts (classroom_id, publish_at desc);

-- 학생 알림장 조회: 소속 학급 + 공개 시각 도래분만
drop policy if exists "학생 소속 학급 알림장 조회" on public.posts;
create policy "학생 소속 학급 알림장 조회" on public.posts
  for select using (
    classroom_id = app.student_classroom_id()
    and publish_at <= now()
  );

-- 준비물(post_items)도 부모 알림장이 공개됐을 때만 보이게 (예약분 준비물 은닉)
-- security definer: post_items 정책에서 posts를 RLS 우회로 판정
create or replace function app.post_published(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.posts
    where id = pid and publish_at <= now()
  )
$$;

drop policy if exists "학생 소속 학급 준비물 조회" on public.post_items;
create policy "학생 소속 학급 준비물 조회" on public.post_items
  for select using (
    classroom_id = app.student_classroom_id()
    and app.post_published(post_id)
  );

notify pgrst, 'reload schema';
