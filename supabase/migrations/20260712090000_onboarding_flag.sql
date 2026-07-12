-- ============================================================
-- 온보딩 완료 플래그 — 첫 가입 교사 안내(/welcome) 재노출 방지
-- null = 아직 온보딩 안 함. 완료/건너뛰기/예시 학급 생성 시 now()로 채운다.
-- 기존 profiles 정책("본인 프로필 수정")이 update를 강제하므로 컬럼 grant만 추가.
-- ============================================================
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

grant update (onboarded_at) on public.profiles to authenticated;

notify pgrst, 'reload schema';
