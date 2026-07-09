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

## 다음 할 것
1. Supabase 프로젝트 생성 및 연결
2. M1 스키마 + RLS 정책 초안

## 메모 / 결정 사항
- import alias는 `@/*`, 소스는 `src/` 디렉토리 사용
- create-next-app이 생성한 AGENTS.md(Next.js 최신 버전 주의사항)는 유지,
  CLAUDE.md 상단에서 `@AGENTS.md`로 참조
- `.claude/settings.local.json`은 .gitignore 처리
