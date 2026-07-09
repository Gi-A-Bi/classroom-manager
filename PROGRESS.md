# PROGRESS.md — 작업 진행 기록

> 이 파일은 학교↔집 어디서든 작업을 이어받기 위한 인수인계 문서입니다.
> 세션을 마칠 때마다 Claude Code에게 이 파일 갱신을 요청하세요.
> 예: "오늘 작업 내용을 PROGRESS.md에 정리해줘"

## 현재 마일스톤
M1 — 수직 조각 (진행 중)

## 완료한 것
- 2026-07-09: git 저장소 초기화, GitHub(Gi-A-Bi/classroom-manager) 연결 및 첫 푸시
- 2026-07-09: Next.js + TypeScript + Tailwind 프로젝트 초기화
  (create-next-app, App Router, src 디렉토리, ESLint, Turbopack, npm)
- 2026-07-09: 로컬 개발 환경 구축 — WSL2 + Docker Desktop 설치,
  Supabase CLI(dev 의존성) + `supabase start` 로컬 스택 기동
- 2026-07-09: M1 핵심 스키마 + RLS 마이그레이션 작성·적용·검증 완료
  (20260709014218_m1_core_schema.sql — 테넌트 격리/학생 조회/쓰기 차단 테스트 통과)

## 다음 할 것
1. Supabase 클라이언트 유틸 작성 (@supabase/ssr, RLS 적용 클라이언트)
2. 교사 이메일 인증 (가입/로그인 UI)
3. 학생 커스텀 인증 (학급코드+번호+PIN → JWT 발급, app_role/classroom_id/student_id 클레임)

## 메모 / 결정 사항
- import alias는 `@/*`, 소스는 `src/` 디렉토리 사용
- create-next-app이 생성한 AGENTS.md(Next.js 최신 버전 주의사항)는 유지,
  CLAUDE.md 상단에서 `@AGENTS.md`로 참조
- `.claude/settings.local.json`은 .gitignore 처리
- Supabase 클라우드 슬롯 부족 → 로컬(Docker) 개발로 진행, 배포 시 클라우드 연결
- 학생 인증: 커스텀 JWT(role='authenticated' + app_role/classroom_id 클레임)를 RLS가 검사.
  M2 읽음확인·준비물 체크 등 학생 쓰기는 해당 테이블에 student_id 클레임 기반 정책 추가로 해결
- students 테이블은 학생 role 접근 정책 없음(pin_hash 보호), PIN 검증은 service_role 서버 경로만
- 이 Supabase 버전은 API 역할에 DML grant 자동 부여 안 함 → 마이그레이션에 명시적 grant 필요
- Windows 제약: analytics 비활성화(config.toml), `supabase start --ignore-health-check` 사용,
  `db reset` 실패 시 `stop --no-backup` 후 재시작으로 대체
- 로컬 키는 `.env.local`(gitignore됨), service_role 키는 NEXT_PUBLIC_ 접두사 금지
