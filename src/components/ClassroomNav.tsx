import Link from "next/link";

const MENU = [
  ["posts", "알림장"],
  ["students", "학생 명렬"],
  ["timetable", "시간표"],
  ["calendar", "캘린더"],
] as const;

export function ClassroomNav({
  classroomId,
  current,
}: {
  classroomId: string;
  current: (typeof MENU)[number][0];
}) {
  return (
    <nav className="flex flex-wrap items-center gap-4 text-sm">
      <Link href="/dashboard" className="text-blue-600 underline">
        ← 대시보드
      </Link>
      <span className="text-gray-300">|</span>
      {MENU.map(([key, label]) =>
        key === current ? (
          <span key={key} className="font-bold">
            {label}
          </span>
        ) : (
          <Link
            key={key}
            href={`/dashboard/classrooms/${classroomId}/${key}`}
            className="text-blue-600 underline"
          >
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
