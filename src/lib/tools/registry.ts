// 도구 레지스트리 — 새 도구는 여기 한 줄 추가 + /tools/[key] 페이지 구현이면 끝.
// 공통 규약(명렬 읽기·결과 저장·공개 토글)은 lib/tools/shared.ts 참고.

export type ToolMeta = {
  key: string; // tool_key (DB 저장 키)
  name: string;
  emoji: string;
  description: string;
  pill: string; // 카드 액센트 클래스
};

export const TOOLS: ToolMeta[] = [
  {
    key: "seating",
    name: "자리바꾸기",
    emoji: "🪑",
    description: "조건을 지정해 좌석을 랜덤 배치하고 자리표를 만들어요.",
    pill: "bg-teal-50 text-teal-800",
  },
];

export function getTool(key: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.key === key);
}
