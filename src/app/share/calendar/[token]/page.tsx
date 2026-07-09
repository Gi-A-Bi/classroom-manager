import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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
import type { Database } from "@/lib/supabase/types";
import { getTheme } from "@/lib/themes";

// 검색엔진 수집 방지 — 링크를 아는 사람만 보는 페이지
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const LAYER_STYLE = {
  school: "bg-orange-100 text-orange-800",
  classroom: "bg-blue-100 text-blue-800",
} as const;

type SharedEvent = {
  id: string;
  title: string;
  layer: "school" | "classroom";
  event_date: string;
  end_date: string | null;
};

export default async function SharedCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { token } = await params;
  const { month } = await searchParams;

  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  const { year, monthIndex } = parseMonth(month);
  const thisMonth = monthString(year, monthIndex);
  const monthStart = `${thisMonth}-01`;
  const monthEnd = monthEndString(year, monthIndex);
  const prev = addMonths(year, monthIndex, -1);
  const next = addMonths(year, monthIndex, 1);
  const weeks = monthGrid(year, monthIndex);
  const today = todayString();

  // 익명(anon) 클라이언트 — 테이블 권한이 전혀 없어 shared_calendar 함수
  // 결과 외에는 아무 데이터에도 접근할 수 없다. 쿠키·세션도 쓰지 않는다.
  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data } = await supabase.rpc("shared_calendar", {
    p_token: token,
    p_from: monthStart,
    p_to: monthEnd,
  });

  const shared = data as {
    classroom_name: string;
    theme_color: string | null;
    events: SharedEvent[];
  } | null;

  // 토큰이 유효하지 않거나 공유가 꺼진 경우
  if (!shared) notFound();

  const theme = getTheme(shared.theme_color);
  const events = shared.events ?? [];

  const eventsByDate = new Map<string, SharedEvent[]>();
  for (const e of events) {
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <header className={`overflow-hidden rounded-2xl ${theme.soft}`}>
        <div className={`h-1.5 ${theme.topbar}`} />
        <div className="px-4 py-3">
          <h1 className={`text-xl font-bold ${theme.text}`}>
            {shared.classroom_name} 캘린더
          </h1>
          <p className="text-sm text-gray-600">학부모 공유용 · 보기 전용</p>
        </div>
      </header>

      <div className="flex items-center justify-between">
        <Link
          href={`?month=${monthString(prev.year, prev.monthIndex)}`}
          className="rounded-xl border bg-white px-3.5 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50"
        >
          ←
        </Link>
        <h2 className="text-lg font-bold tabular-nums">
          {year}년 {monthIndex + 1}월
        </h2>
        <Link
          href={`?month=${monthString(next.year, next.monthIndex)}`}
          className="rounded-xl border bg-white px-3.5 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50"
        >
          →
        </Link>
      </div>

      <div className="flex gap-2 text-xs">
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
                          className={`text-[10px] tabular-nums ${date === today ? "font-bold" : "text-gray-500"}`}
                        >
                          {Number(date.slice(8))}
                        </span>
                        {(eventsByDate.get(date) ?? []).map((e) => (
                          <span
                            key={e.id}
                            title={e.title}
                            className={`truncate rounded px-0.5 text-[10px] leading-tight ${LAYER_STYLE[e.layer]}`}
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
        <h2 className="text-sm font-bold text-gray-500">이번 달 일정</h2>
        {events.length > 0 ? (
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
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${LAYER_STYLE[e.layer]}`}
                >
                  {e.layer === "school" ? "학교" : "학급"}
                </span>
                {e.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed p-6 text-center text-sm text-gray-400">
            🗓️ 이번 달에는 등록된 일정이 없어요.
          </p>
        )}
      </section>

      <p className="pb-4 text-center text-xs text-gray-400">
        이 페이지는 캘린더만 보여주는 공유 화면입니다.
      </p>
    </main>
  );
}
