// 학급 테마컬러 — Tailwind가 클래스를 인식하도록 전체 클래스명을 리터럴로 둔다.
// soft: 페이지 헤더 배경, swatch: 색 선택 원, text: 포인트 글자,
// topbar: 헤더 상단 액센트 줄, underline: 탭 밑줄 border 색

export const THEMES = {
  blue: {
    label: "파랑",
    swatch: "bg-blue-500",
    soft: "bg-blue-50",
    text: "text-blue-900",
    topbar: "bg-blue-400",
    underline: "border-blue-500",
  },
  teal: {
    label: "청록",
    swatch: "bg-teal-500",
    soft: "bg-teal-50",
    text: "text-teal-900",
    topbar: "bg-teal-400",
    underline: "border-teal-500",
  },
  green: {
    label: "초록",
    swatch: "bg-green-500",
    soft: "bg-green-50",
    text: "text-green-900",
    topbar: "bg-green-400",
    underline: "border-green-500",
  },
  amber: {
    label: "노랑",
    swatch: "bg-amber-400",
    soft: "bg-amber-50",
    text: "text-amber-900",
    topbar: "bg-amber-300",
    underline: "border-amber-400",
  },
  orange: {
    label: "주황",
    swatch: "bg-orange-500",
    soft: "bg-orange-50",
    text: "text-orange-900",
    topbar: "bg-orange-400",
    underline: "border-orange-500",
  },
  rose: {
    label: "분홍",
    swatch: "bg-rose-400",
    soft: "bg-rose-50",
    text: "text-rose-900",
    topbar: "bg-rose-300",
    underline: "border-rose-400",
  },
  purple: {
    label: "보라",
    swatch: "bg-purple-500",
    soft: "bg-purple-50",
    text: "text-purple-900",
    topbar: "bg-purple-400",
    underline: "border-purple-500",
  },
  slate: {
    label: "회색",
    swatch: "bg-slate-500",
    soft: "bg-slate-100",
    text: "text-slate-900",
    topbar: "bg-slate-400",
    underline: "border-slate-500",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export function getTheme(key?: string | null) {
  return THEMES[(key ?? "") as ThemeKey] ?? THEMES.blue;
}

// 파스텔 팝 — 시간표 칩 등 나열 요소에 순서대로 입히는 파스텔 조합
export const PASTEL_CHIPS = [
  "bg-purple-50 text-purple-800",
  "bg-pink-50 text-pink-800",
  "bg-teal-50 text-teal-800",
  "bg-amber-50 text-amber-800",
  "bg-blue-50 text-blue-800",
  "bg-green-50 text-green-800",
  "bg-orange-50 text-orange-800",
  "bg-slate-100 text-slate-800",
] as const;

export function pastelChip(index: number) {
  return PASTEL_CHIPS[index % PASTEL_CHIPS.length];
}
