// 종이 플래너 디자인 시스템 — 공통 클래스 상수.
// 컴포넌트로 감싸기 애매한 폼 요소 등에서 className으로 바로 쓴다.

// 입력류: 종이색 배경 + 얇은 선. 포커스 시 잉크 밑선 강조.
export const inputClass =
  "rounded-lg border border-line bg-paper-soft px-3 py-2 text-ink " +
  "placeholder:text-ink-faint focus:border-line-strong focus:outline-none " +
  "focus:ring-2 focus:ring-line-strong/40 transition-colors";

// 버튼 변형
export const btn = {
  // 주요 동작 — 잉크 채움
  primary:
    "rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper " +
    "transition-colors hover:bg-ink/85 active:scale-[0.98]",
  // 보조 — 종이 + 테두리
  soft:
    "rounded-lg border border-line bg-paper px-4 py-2 text-sm font-medium " +
    "text-ink-soft transition-colors hover:bg-paper-soft active:scale-[0.98]",
  // 조용한 텍스트 버튼
  ghost:
    "rounded-lg px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft",
} as const;

// 카드 — 그림자 대신 얇은 테두리
export const cardClass = "rounded-2xl border border-line bg-paper";

// 섹션 라벨 — 작은 대문자풍 소제목
export const sectionLabelClass =
  "text-xs font-bold uppercase tracking-widest text-ink-faint";
