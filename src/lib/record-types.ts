// 빠른 기록 유형 — 기본 6종은 앱에 내장(특수 동작 포함), 커스텀 유형은 record_types 테이블.
// 서버·클라이언트 공용(순수 모듈).

export type RecordFlow =
  | "simple" // 바로 저장 (준비물 미지참)
  | "subject" // 과목 세부 (숙제 미제출)
  | "peer" // 상대 학생 선택 → 상호 연결 (갈등)
  | "subs" // 정해진 세부 선택 (칭찬·건강)
  | "memo"; // 자유 메모 위주 (기타 관찰)

export type BuiltinType = {
  key: string;
  label: string;
  chip: string; // 유형 칩 색 (tailwind)
  flow: RecordFlow;
  subs?: string[];
};

export const BUILTIN_TYPES: BuiltinType[] = [
  { key: "praise", label: "칭찬", chip: "bg-green-100 text-green-800", flow: "subs", subs: ["도움", "배려", "발표", "성실"] },
  { key: "homework", label: "숙제 미제출", chip: "bg-amber-100 text-amber-800", flow: "subject" },
  { key: "supplies", label: "준비물 미지참", chip: "bg-orange-100 text-orange-800", flow: "simple" },
  { key: "conflict", label: "갈등·다툼", chip: "bg-red-100 text-red-700", flow: "peer" },
  { key: "health", label: "건강", chip: "bg-blue-100 text-blue-800", flow: "subs", subs: ["아픔", "보건실"] },
  { key: "observation", label: "기타 관찰", chip: "bg-paper-soft text-ink-soft", flow: "memo" },
];

export const BUILTIN_KEYS = BUILTIN_TYPES.map((t) => t.key);

const LABEL: Record<string, string> = Object.fromEntries(
  BUILTIN_TYPES.map((t) => [t.key, t.label]),
);
const CHIP: Record<string, string> = Object.fromEntries(
  BUILTIN_TYPES.map((t) => [t.key, t.chip]),
);

// 유형 표시명 (custom이면 detail이 라벨)
export function typeLabel(recordType: string, detail?: string | null): string {
  if (recordType === "custom") return detail || "기타";
  return LABEL[recordType] ?? recordType;
}

export function typeChip(recordType: string): string {
  if (recordType === "custom") return "bg-purple-100 text-purple-700";
  return CHIP[recordType] ?? "bg-paper-soft text-ink-soft";
}
