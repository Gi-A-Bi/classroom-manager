-- 학생 초기 PIN 플래그: 첫 로그인 시 PIN 변경을 강제하기 위한 상태.
-- 명렬 등록 직후는 true, 학생이 새 PIN을 설정하면 false.
alter table public.students
  add column pin_is_initial boolean not null default true;

-- 알림장 날짜: 작성일(created_at)과 별개로 "몇 월 며칠자 알림장"인지 표시.
alter table public.posts
  add column post_date date not null default current_date;

create index posts_classroom_post_date_idx
  on public.posts (classroom_id, post_date desc);
