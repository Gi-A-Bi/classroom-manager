import { switchMode } from "@/app/work/actions";

// [학급 운영 | 업무 관리] 전환 탭 — 누르면 마지막 사용 모드로 저장된다
export function ModeSwitch({ current }: { current: "class" | "work" }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border bg-white p-0.5 text-sm font-medium shadow-sm">
      <form action={switchMode}>
        <input type="hidden" name="mode" value="class" />
        <button
          type="submit"
          className={`rounded-full px-3 py-1.5 transition-colors ${
            current === "class"
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          🏫 학급 운영
        </button>
      </form>
      <form action={switchMode}>
        <input type="hidden" name="mode" value="work" />
        <button
          type="submit"
          className={`rounded-full px-3 py-1.5 transition-colors ${
            current === "work"
              ? "bg-slate-700 text-white"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          💼 업무 관리
        </button>
      </form>
    </div>
  );
}
