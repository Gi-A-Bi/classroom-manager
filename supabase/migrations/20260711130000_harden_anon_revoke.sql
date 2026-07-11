-- ============================================================
-- anon 권한 강화 (클라우드 배포 대응)
-- 호스팅 Supabase는 public 스키마 테이블에 anon 권한을 기본 부여한다
-- (로컬 CLI 스택과 다름). RLS가 행을 전부 막아 유출은 없지만,
-- 설계 원칙(비로그인은 테이블 접근 자체 거부 — 이중 방어)에 맞게 회수한다.
-- 공유 링크는 security definer RPC(shared_calendar)의 EXECUTE 권한만 쓰므로
-- 영향 없다. 스키마 USAGE는 RPC 호출에 필요해 유지한다.
-- ============================================================

-- 1) 기존 테이블·시퀀스에서 anon 권한 전부 회수
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- 2) 앞으로 만들어질 테이블·시퀀스에도 자동 부여되지 않도록
--    (마이그레이션 실행 주체인 postgres가 만드는 객체 기준)
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- PostgREST 스키마 캐시 갱신
notify pgrst, 'reload schema';
