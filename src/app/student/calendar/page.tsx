import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addMonths,
  DAY_NAMES,
  dateRange,
  formatMonthDay,
  monthEndString,
  monthGrid,
  monthString,
  parseMonth,
  todayString,
} from "@/lib/dates";
import { getStudentSession } from "@/lib/student-auth";
import { createStudentClient } from "@/lib/supabase/student";

const LAYER_STYLE = {
  school: "bg-orange-100 text-orange-800",
  classroom: "bg-blue-100 text-blue-800",
} as const;

export default async function StudentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const session = await getStudentSession();
  if (!session) redirect("/student/login");

  const { year, monthIndex } = parseMonth(month);
  const thisMonth = monthString(year, monthIndex);
  const monthStart = `${thisMonth}-01`;
  const monthEnd = monthEndString(year, monthIndex);
  const prev = addMonths(year, monthIndex, -1);
  const next = addMonths(year, monthIndex, 1);
  const weeks = monthGrid(year, monthIndex);
  const today = todayString();

  const supabase = createStudentClient(session.token);
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, end_date, layer")
    .lte("event_date", monthEnd)
    .or(`end_date.gte.${monthStart},event_date.gte.${monthStart}`)
    .order("event_date");

  // 기간 일정은 해당 기간의 모든 날짜에 표시
  const eventsByDate = new Map<string, NonNullable<typeof events>>();
  for (const e of events ?? []) {
    const from = e.event_date < monthStart ? monthStart : e.event_date;
    const rawTo = e.end_date ?? e.event_date;
    const to = rawTo > monthEnd ? monthEnd : rawTo;
    for (const date of dateRange(from, to)) {
      const list = eventsByDate.get(date) ?? [];
      list.push(e);
      eventsByDate.set(date, list);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 p-5">
      <nav>
        <Link href="/student" className="text-blue-600 underline">
          ← 홈으로
        </Link>
      </nav>

      <div className="flex items-center justify-between">
        <Link
          href={`/student/calendar?month=${monthString(prev.year, prev.monthIndex)}`}
          className="rounded-lg border-2 px-3 py-1.5 text-sm"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold">
          {year}년 {monthIndex + 1}월
        </h1>
        <Link
          href={`/student/calendar?month=${monthString(next.year, next.monthIndex)}`}
          className="rounded-lg border-2 px-3 py-1.5 text-sm"
        >
          →
        </Link>
      </div>

      <div className="flex gap-3 text-xs">
        <span className="rounded px-1.5 py-0.5 bg-orange-100 text-orange-800">
          학교 일정
        </span>
        <span className="rounded px-1.5 py-0.5 bg-blue-100 text-blue-800">
          학급 일정
        </span>
      </div>

      <div className="rounded-2xl border bg-white p-2 shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {DAY_NAMES.map((name) => (
              <th key={name} className="border bg-gray-50 p-1 text-xs">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((date, j) => (
                <td
                  key={j}
                  className={`h-16 w-[14%] border p-0.5 align-top ${
                    date === today ? "bg-yellow-50" : ""
                  }`}
                >
                  {date && (
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[10px] ${date === today ? "font-bold" : "text-gray-500"}`}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {(eventsByDate.get(date) ?? []).map((e) => (
                        <span
                          key={e.id}
                          className={`truncate rounded px-0.5 text-[10px] leading-tight ${LAYER_STYLE[e.layer as keyof typeof LAYER_STYLE]}`}
                          title={e.title}
                        >
                          {e.title}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">이번 달 일정</h2>
        {events && events.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-xl border bg-white p-3 text-sm shadow-sm"
              >
                <span className="shrink-0 font-bold tabular-nums text-gray-600">
                  {formatMonthDay(e.event_date)}
                  {e.end_date && `~${formatMonthDay(e.end_date)}`}
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${LAYER_STYLE[e.layer as keyof typeof LAYER_STYLE]}`}
                >
                  {e.layer === "school" ? "학교" : "학급"}
                </span>
                {e.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-gray-400">
            🗓️ 이번 달 일정이 없어요.
          </p>
        )}
      </section>
    </main>
  );
}
