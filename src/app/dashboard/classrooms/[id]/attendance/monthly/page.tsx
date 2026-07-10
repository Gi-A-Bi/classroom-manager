import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import {
  addMonths,
  DAY_NAMES,
  monthEndString,
  monthGrid,
  monthString,
  parseMonth,
  todayString,
} from "@/lib/dates";
import { ATTENDANCE_TYPES, type AttendanceType } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/server";

export default async function MonthlyAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { year, monthIndex } = parseMonth(month);
  const thisMonth = monthString(year, monthIndex);
  const monthStart = `${thisMonth}-01`;
  const monthEnd = monthEndString(year, monthIndex);
  const prev = addMonths(year, monthIndex, -1);
  const next = addMonths(year, monthIndex, 1);
  const weeks = monthGrid(year, monthIndex);
  const today = todayString();

  const [{ data: classroom }, { data: records }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, theme_color")
      .eq("id", id)
      .single(),
    supabase
      .from("attendance_records")
      .select("record_date, type")
      .eq("classroom_id", id)
      .gte("record_date", monthStart)
      .lte("record_date", monthEnd),
  ]);

  if (!classroom) notFound();

  // 날짜별 유형 카운트
  const byDate = new Map<string, Map<AttendanceType, number>>();
  for (const r of records ?? []) {
    const m = byDate.get(r.record_date) ?? new Map();
    m.set(r.type as AttendanceType, (m.get(r.type as AttendanceType) ?? 0) + 1);
    byDate.set(r.record_date, m);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="attendance"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="출결"
        themeColor={classroom.theme_color}
      />

      <nav className="-mt-2 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/dashboard/classrooms/${classroom.id}/attendance`}
          className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink"
        >
          ← 오늘 입력
        </Link>
        <Link
          href={`/dashboard/classrooms/${classroom.id}/attendance/summary`}
          className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink"
        >
          학생별 집계
        </Link>
      </nav>

      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/classrooms/${classroom.id}/attendance/monthly?month=${monthString(prev.year, prev.monthIndex)}`}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
        >
          ← {prev.monthIndex + 1}월
        </Link>
        <h1 className="text-2xl font-display tabular-nums text-ink">
          {year}년 {monthIndex + 1}월
        </h1>
        <Link
          href={`/dashboard/classrooms/${classroom.id}/attendance/monthly?month=${monthString(next.year, next.monthIndex)}`}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
        >
          {next.monthIndex + 1}월 →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper p-3">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {DAY_NAMES.map((name, i) => (
                <th
                  key={name}
                  className={`border border-line bg-paper-soft p-2 ${i === 5 ? "text-blue-600" : i === 6 ? "text-red-500" : "text-ink"}`}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map((cellDate, j) => {
                  const counts = cellDate ? byDate.get(cellDate) : null;
                  return (
                    <td
                      key={j}
                      className={`h-20 w-[14%] border border-line p-1 align-top ${cellDate === today ? "bg-paper-soft" : ""}`}
                    >
                      {cellDate && (
                        <Link
                          href={`/dashboard/classrooms/${classroom.id}/attendance?date=${cellDate}`}
                          className="flex h-full flex-col gap-0.5"
                        >
                          <span
                            className={`text-xs tabular-nums ${cellDate === today ? "font-bold text-ink" : "text-ink-soft"}`}
                          >
                            {Number(cellDate.slice(8))}
                          </span>
                          {counts &&
                            [...counts.entries()].map(([type, count]) => (
                              <span
                                key={type}
                                className={`truncate rounded px-1 text-[11px] leading-tight ${ATTENDANCE_TYPES[type].style}`}
                              >
                                {ATTENDANCE_TYPES[type].label} {count}
                              </span>
                            ))}
                        </Link>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        예외가 있는 날에 표시돼요. 날짜를 누르면 그날 입력 화면으로 가요.
      </p>
    </main>
  );
}
