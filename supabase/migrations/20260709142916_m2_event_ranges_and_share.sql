-- ============================================================
-- 기간 일정(end_date) + 학부모용 캘린더 공유 링크(share_token)
-- ============================================================

-- 1. 기간 일정: 종료일 (단일 일정은 null)
alter table public.events
  add column end_date date
  check (end_date is null or end_date >= event_date);

-- 2. 캘린더 공유 토큰 (null = 공유 꺼짐)
alter table public.classrooms
  add column share_token text unique
  check (share_token is null or share_token ~ '^[a-f0-9]{32}$');

-- 3. 공유 캘린더 조회 함수 — 비로그인(anon) 접근의 유일한 통로.
--    anon에는 어떤 테이블 권한도 없으므로, 이 함수(security definer)가
--    반환하는 학급 이름·테마·일정 외에는 아무것도 읽을 수 없다.
--    조회 범위는 최대 62일로 제한한다.
create or replace function public.shared_calendar(
  p_token text,
  p_from date,
  p_to date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'classroom_name', c.name,
    'theme_color', c.theme_color,
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'title', e.title,
          'layer', e.layer,
          'event_date', e.event_date,
          'end_date', e.end_date
        )
        order by e.event_date
      )
      from public.events e
      where e.classroom_id = c.id
        and e.event_date <= p_to
        and coalesce(e.end_date, e.event_date) >= p_from
    ), '[]'::jsonb)
  )
  from public.classrooms c
  where c.share_token is not null
    and c.share_token = p_token
    and p_to >= p_from
    and p_to - p_from <= 62
$$;

revoke all on function public.shared_calendar(text, date, date) from public;
grant execute on function public.shared_calendar(text, date, date) to anon, authenticated;
