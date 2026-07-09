# PROGRESS.md — 작업 진행 기록

> 이 파일은 학교↔집 어디서든 작업을 이어받기 위한 인수인계 문서입니다.
> 세션을 마칠 때마다 Claude Code에게 이 파일 갱신을 요청하세요.
> 예: "오늘 작업 내용을 PROGRESS.md에 정리해줘"

## 현재 마일스톤
M2 — 학급 페이지 완성 (진행 중: 시간표·캘린더 완료, 읽음확인·준비물 체크 남음)

## 완료한 것
- 2026-07-09: git 저장소 초기화, GitHub(Gi-A-Bi/classroom-manager) 연결 및 첫 푸시
- 2026-07-09: Next.js + TypeScript + Tailwind 프로젝트 초기화
  (create-next-app, App Router, src 디렉토리, ESLint, Turbopack, npm)
- 2026-07-09: 로컬 개발 환경 구축 — WSL2 + Docker Desktop 설치,
  Supabase CLI(dev 의존성) + `supabase start` 로컬 스택 기동
- 2026-07-09: M1 핵심 스키마 + RLS 마이그레이션 작성·적용·검증 완료
  (20260709014218_m1_core_schema.sql — 테넌트 격리/학생 조회/쓰기 차단 테스트 통과)
- 2026-07-09: Supabase 클라이언트 유틸(@supabase/ssr) + 세션 갱신 proxy.ts
  (Next 16은 middleware.ts가 proxy.ts로 개명됨)
- 2026-07-09: 교사 회원가입/로그인/로그아웃 (+비로그인 /dashboard 접근 차단)
- 2026-07-09: 대시보드 — 학년도 등록, 학급 생성(학급코드 6자리 자동 발급)
- 2026-07-09: 학생 명렬 일괄 등록 ("번호 이름" 여러 줄 붙여넣기, 초기 PIN 공통
  bcrypt 해시, 형식·중복 검증) — 브라우저 E2E 흐름 전체 확인 완료
- 2026-07-09: 학생 커스텀 인증 완성 — 학급코드+번호+PIN 로그인(모바일 우선 UI),
  초기 PIN(0000) 첫 로그인 시 새 PIN 설정 강제, jose로 커스텀 JWT 발급
  (role=authenticated + app_role/classroom_id/student_id 클레임, httpOnly 쿠키 7일)
- 2026-07-09: 알림장 완성 — 교사 작성(제목·내용·날짜, posts.post_date 컬럼 추가),
  학생 홈 목록/상세 조회. E2E 검증: 교사 작성 → 자기 반 학생 조회 OK,
  다른 반 학생은 목록에 안 보이고 직접 URL 접근도 404 (RLS 차단) 확인
- **M1 수직 조각 완성**: 가입 → 학급 생성 → 명렬 등록 → 알림장 작성 →
  학생 코드 로그인 → 알림장 확인까지 전 구간 동작
- 2026-07-09 (M2): PIN 초기화 — 명렬 화면에 학생별 버튼(0000 리셋 + 재설정 강제),
  PIN 상태 배지 표시. 초기화 → 0000 로그인 → 재설정 강제까지 E2E 확인
- 2026-07-09 (M2): 시간표 — 교사 요일(월~금)×교시(1~6) 격자 편집(빈 칸=삭제, upsert),
  학생 홈 상단 "오늘의 시간표". timetable_slots 테이블 + RLS
- 2026-07-09 (M2): 캘린더 — 교사 일정 등록/삭제(학교=주황/학급=파랑 레이어),
  월간 그리드(월요일 시작, 오늘 하이라이트, 이전/다음 달 이동),
  학생 월간 캘린더 + 이번 달 일정 리스트. events 테이블 + RLS (격리 SQL 검증 통과)
- 2026-07-09 (M2): 교사 대시보드 투데이 뷰 — 학급별 오늘 시간표·오늘 일정·
  최근 알림장 2건 요약, 학급 페이지 공통 내비게이션(ClassroomNav)

## 다음 할 것 (M2 나머지)
1. 알림장 읽음확인·준비물 체크 (학생 쓰기 첫 사례 — student_id 클레임 정책 추가)
2. UI 다듬기 (카드 레이아웃, 테마컬러)
3. 시간표 교시 수 학급별 설정 (지금은 6교시 고정)

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
- WSL2 설치 후 Windows가 3000번대 포트를 예약 → 개발 서버는 3300 포트 사용
- 명렬 붙여넣기의 이름은 nickname 컬럼에 저장 (개인정보 최소화 — 실명 필수 아님)
- 학생 세션: httpOnly 쿠키(student_session), 교사 세션과 독립 — 한 브라우저에서 공존 가능
- 초기 PIN 변경은 단기(10분) 설정 토큰 쿠키로 처리, 새 PIN으로 0000 재사용 금지
- 학생 로그인 실패 메시지는 어느 항목이 틀렸는지 노출하지 않음 (열거 공격 방지)
- 로컬 테스트 데이터 현황: 4학년 1반(QMEDX2) 1번 PIN 1234로 변경됨,
  3학년 2반(RYQW5N) 1번 PIN 5678로 변경됨, 나머지 학생은 초기 0000
