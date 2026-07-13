// 생기부 참고 모드 — 순수 헬퍼(서버·라우트 공용).
// 1년치 기록을 학기·학년 단위로 잘라, 주제별로 묶고, 한 줄로 압축한다.
// ※ 생기부를 여기서 "작성"하지 않는다. 나이스 작성 중 옆에 띄워두고 보는 자료집.

import { formatMonthDay } from "@/lib/dates";

// ---------- 기간(학기·학년) ----------
export const REPORT_PERIODS = [
  { key: "sem1", label: "1학기" },
  { key: "sem2", label: "2학기" },
  { key: "year", label: "학년 전체" },
] as const;

export type ReportPeriodKey = (typeof REPORT_PERIODS)[number]["key"];

// 학년도 시작 연도 (3~2월. 1~2월은 전년도 학년도)
function academicYearStart(today: string): number {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return m >= 3 ? y : y - 1;
}

export function currentSemester(today: string): ReportPeriodKey {
  const m = Number(today.slice(5, 7));
  return m >= 3 && m <= 8 ? "sem1" : "sem2";
}

// [since, endExcl) 반개구간 + 라벨
export function reportWindow(
  rp: string,
  today: string,
): { since: string; endExcl: string; label: string } {
  const y = academicYearStart(today);
  if (rp === "sem2")
    return { since: `${y}-09-01`, endExcl: `${y + 1}-03-01`, label: `${y}학년도 2학기` };
  if (rp === "year")
    return { since: `${y}-03-01`, endExcl: `${y + 1}-03-01`, label: `${y}학년도` };
  return { since: `${y}-03-01`, endExcl: `${y}-09-01`, label: `${y}학년도 1학기` };
}

// ---------- 주제별 분류 ----------
export const REPORT_GROUPS = [
  { key: "learning", label: "학습" },
  { key: "behavior", label: "행동·태도" },
  { key: "relation", label: "관계" },
  { key: "attend", label: "출결" },
  { key: "etc", label: "기타" },
] as const;

export type GroupKey = (typeof REPORT_GROUPS)[number]["key"];

const LEARN_TAGS = ["학습", "수업", "발표", "과제", "숙제", "독서", "탐구", "성적", "공부"];
const REL_TAGS = ["모둠", "리더십", "배려", "협동", "친구", "관계", "도움", "나눔", "소통", "협력"];
const BEHAV_TAGS = ["성실", "태도", "규칙", "책임", "예의", "정리", "준비", "질서"];

export type Classifiable = {
  kind: "grade" | "attendance" | "record";
  recordType?: string;
  recordDetail?: string | null;
  tags?: string[];
};

// 태그 > 유형/세부 순으로 자동 분류, 애매하면 기타.
export function classifyGroup(it: Classifiable): GroupKey {
  if (it.kind === "grade") return "learning";
  if (it.kind === "attendance") return "attend";

  const tags = it.tags ?? [];
  const hit = (arr: string[]) => tags.some((t) => arr.includes(t));
  if (hit(LEARN_TAGS)) return "learning";
  if (hit(REL_TAGS)) return "relation";
  if (hit(BEHAV_TAGS)) return "behavior";

  const d = it.recordDetail ?? "";
  switch (it.recordType) {
    case "homework":
      return "learning";
    case "conflict":
      return "behavior";
    case "supplies":
      return "behavior";
    case "praise":
      if (d === "발표") return "learning";
      if (d === "도움" || d === "배려") return "relation";
      return "behavior"; // 성실·기타 칭찬
    case "health":
      return "etc";
    default:
      return "etc"; // 기타 관찰·커스텀 등 애매한 것
  }
}

// ---------- 한 줄 압축 ----------
export type LineInput = {
  date: string;
  kind: "grade" | "attendance" | "record";
  title: string;
  value?: string;
  detail?: string | null; // 출결 메모 또는 기록 내용(content)
  tags?: string[];
  peerName?: string | null;
};

// "3/15 수학 · 3단원 평가 92점 / 100" 형태. withDate=false면 날짜 생략.
export function compressLine(it: LineInput, withDate = true): string {
  let body: string;
  if (it.kind === "grade") {
    body = it.value ? `${it.title} ${it.value}` : it.title;
  } else if (it.kind === "attendance") {
    body = it.detail ? `${it.title} — ${it.detail}` : it.title;
  } else {
    const content = it.detail ? it.detail.replace(/\s*\n\s*/g, " ").trim() : "";
    const tags = (it.tags ?? []).map((t) => `#${t}`).join(" ");
    const peer = it.peerName ? ` (상대: ${it.peerName})` : "";
    body = it.title + peer + (content ? `: ${content}` : "") + (tags ? ` ${tags}` : "");
  }
  return withDate ? `${formatMonthDay(it.date)} ${body}` : body;
}
