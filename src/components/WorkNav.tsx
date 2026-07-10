import Link from "next/link";
import { ModeSwitch } from "./ModeSwitch";

const WORK_MENU = [
  ["", "🗂️ 대시보드"],
  ["todos", "✅ 할 일"],
  ["documents", "📄 공문"],
  ["calendar", "🗓️ 캘린더"],
  ["links", "🔗 링크"],
] as const;

// 업무 모드 공통 헤더 — 학급 모드와 구분되는 차분한 남색 밴드
export function WorkNav({
  current,
}: {
  current: (typeof WORK_MENU)[number][0];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeSwitch current="work" />
      </div>
      <nav className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-700 p-2 text-sm font-medium shadow-sm">
        {WORK_MENU.map(([key, label]) => (
          <Link
            key={key}
            href={`/work${key ? `/${key}` : ""}`}
            className={`rounded-xl px-3 py-1.5 transition-colors ${
              key === current
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-200 hover:bg-slate-600"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
