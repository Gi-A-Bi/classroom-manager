import { Briefcase, School } from "lucide-react";
import { switchMode } from "@/app/work/actions";

// [학급 운영 | 업무 관리] 전환 — 종이 토글. 누르면 마지막 사용 모드로 저장.
export function ModeSwitch({ current }: { current: "class" | "work" }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-paper p-0.5 text-sm font-medium">
      <form action={switchMode}>
        <input type="hidden" name="mode" value="class" />
        <button
          type="submit"
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
            current === "class"
              ? "bg-ink text-paper"
              : "text-ink-soft hover:bg-paper-soft"
          }`}
        >
          <School size={15} strokeWidth={1.75} aria-hidden />
          학급 운영
        </button>
      </form>
      <form action={switchMode}>
        <input type="hidden" name="mode" value="work" />
        <button
          type="submit"
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
            current === "work"
              ? "bg-slate-700 text-white"
              : "text-ink-soft hover:bg-paper-soft"
          }`}
        >
          <Briefcase size={15} strokeWidth={1.75} aria-hidden />
          업무 관리
        </button>
      </form>
    </div>
  );
}
