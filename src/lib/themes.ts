// 학급 테마컬러 — Tailwind가 클래스를 인식하도록 전체 클래스명을 리터럴로 둔다.
// soft: 페이지 헤더 배경, swatch: 색 선택 원, text: 포인트 글자,
// topbar: 헤더 상단 액센트 줄

export const THEMES = {
  blue: {
    label: "파랑",
    swatch: "bg-blue-500",
    soft: "bg-blue-50",
    text: "text-blue-900",
    topbar: "bg-blue-400",
  },
  teal: {
    label: "청록",
    swatch: "bg-teal-500",
    soft: "bg-teal-50",
    text: "text-teal-900",
    topbar: "bg-teal-400",
  },
  green: {
    label: "초록",
    swatch: "bg-green-500",
    soft: "bg-green-50",
    text: "text-green-900",
    topbar: "bg-green-400",
  },
  amber: {
    label: "노랑",
    swatch: "bg-amber-400",
    soft: "bg-amber-50",
    text: "text-amber-900",
    topbar: "bg-amber-300",
  },
  orange: {
    label: "주황",
    swatch: "bg-orange-500",
    soft: "bg-orange-50",
    text: "text-orange-900",
    topbar: "bg-orange-400",
  },
  rose: {
    label: "분홍",
    swatch: "bg-rose-400",
    soft: "bg-rose-50",
    text: "text-rose-900",
    topbar: "bg-rose-300",
  },
  purple: {
    label: "보라",
    swatch: "bg-purple-500",
    soft: "bg-purple-50",
    text: "text-purple-900",
    topbar: "bg-purple-400",
  },
  slate: {
    label: "회색",
    swatch: "bg-slate-500",
    soft: "bg-slate-100",
    text: "text-slate-900",
    topbar: "bg-slate-400",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export function getTheme(key?: string | null) {
  return THEMES[(key ?? "") as ThemeKey] ?? THEMES.blue;
}
