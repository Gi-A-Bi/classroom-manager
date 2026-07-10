import Link from "next/link";

// 학급 메뉴 필 — 대시보드 카드와 학급 페이지 내비가 함께 쓴다
export const CLASSROOM_MENU = [
  {
    key: "posts",
    label: "📝 알림장",
    pill: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    active: "bg-amber-200 text-amber-900",
  },
  {
    key: "students",
    label: "🧑‍🏫 학생 명렬",
    pill: "bg-purple-50 text-purple-800 hover:bg-purple-100",
    active: "bg-purple-200 text-purple-900",
  },
  {
    key: "timetable",
    label: "⏰ 시간표",
    pill: "bg-teal-50 text-teal-800 hover:bg-teal-100",
    active: "bg-teal-200 text-teal-900",
  },
  {
    key: "calendar",
    label: "🗓️ 캘린더",
    pill: "bg-pink-50 text-pink-800 hover:bg-pink-100",
    active: "bg-pink-200 text-pink-900",
  },
  {
    key: "records",
    label: "🔒 기록 카드",
    pill: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    active: "bg-slate-300 text-slate-900",
  },
  {
    key: "grades",
    label: "💯 성적",
    pill: "bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
    active: "bg-indigo-200 text-indigo-900",
  },
] as const;

export function ClassroomNav({
  classroomId,
  current,
}: {
  classroomId: string;
  current: (typeof CLASSROOM_MENU)[number]["key"];
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="rounded-full border bg-white px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-50"
      >
        ← 대시보드
      </Link>
      {CLASSROOM_MENU.map((m) => (
        <Link
          key={m.key}
          href={`/dashboard/classrooms/${classroomId}/${m.key}`}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            m.key === current ? `${m.active} shadow-sm` : m.pill
          }`}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}
