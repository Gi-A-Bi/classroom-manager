import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import {
  addMonths,
  DAY_NAMES,
  dateRange,
  monthEndString,
  monthGrid,
  monthString,
  parseMonth,
  todayString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { addWorkEvent, deleteWorkEvent } from "../actions";

const CATEGORIES = ["연수", "출장", "회의", "평가", "기타"] as const;

type Chip = {
  key: string;
  label: string;
  style: string;
  deletableId?: string;
};

export default async function WorkCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string; class?: string }>;
}) {
  const { month, error, class: classParam } = await searchParams;
  const showClass = classParam === "1";

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

  const [{ data: workEvents }, { data: dueDocs }, { data: classEvents }] =
    await Promise.all([
      supabase
        .from("work_events")
        .select("id, title, category, event_date, end_date")
        .lte("event_date", monthEnd)
        .or(`end_date.gte.${monthStart},event_date.gte.${monthStart}`)
        .order("event_date"),
      supabase
        .from("work_documents")
        .select("id, title, due_date, status")
        .neq("status", "done")
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd),
      showClass
        ? supabase
            .from("events")
            .select("id, title, event_date, end_date, layer")
            .lte("event_date", monthEnd)
            .or(`end_date.gte.${monthStart},event_date.gte.${monthStart}`)
        : Promise.resolve({ data: [] as never[] }),
    ]);

  // 날짜별 칩 구성: 업무 일정(남색) + 공문 기한(빨강) + (토글 시) 학급 일정
  const chipsByDate = new Map<string, Chip[]>();
  const push = (date: string, chip: Chip) => {
    const list = chipsByDate.get(date) ?? [];
    list.push(chip);
    chipsByDate.set(date, list);
  };

  for (const e of workEvents ?? []) {
    const from = e.event_date < monthStart ? monthStart : e.event_date;
    const rawTo = e.end_date ?? e.event_date;
    const to = rawTo > monthEnd ? monthEnd : rawTo;
    for (const date of dateRange(from, to)) {
      push(date, {
        key: `w-${e.id}-${date}`,
        label: `${e.category !== "기타" ? `[${e.category}] ` : ""}${e.title}`,
        style: "bg-slate-200 text-slate-800",
        deletableId: e.id,
      });
    }
  }
  for (const d of dueDocs ?? []) {
    push(d.due_date!, {
      key: `d-${d.id}`,
      label: `📄 ${d.title} 기한`,
      style: "bg-red-100 text-red-700",
    });
  }
  for (const e of classEvents ?? []) {
    const from = e.event_date < monthStart ? monthStart : e.event_date;
    const rawTo = e.end_date ?? e.event_date;
    const to = rawTo > monthEnd ? monthEnd : rawTo;
    for (const date of dateRange(from, to)) {
      push(date, {
        key: `c-${e.id}-${date}`,
        label: e.title,
        style:
          e.layer === "school"
            ? "bg-orange-50 text-orange-700"
            : "bg-blue-50 text-blue-700",
      });
    }
  }

  const baseUrl = (m: string, cls: boolean) =>
    `/work/calendar?month=${m}${cls ? "&class=1" : ""}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="calendar" />

      <h1 className="text-2xl font-extrabold tracking-tight">🗓️ 업무 캘린더</h1>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">일정 등록</h2>
        <form action={addWorkEvent} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="month" value={thisMonth} />
          <label className="flex flex-col gap-1 text-sm">
            날짜
            <input
              type="date"
              name="event_date"
              required
              defaultValue={today}
              className="rounded-lg border p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            종료일 <span className="text-xs text-gray-400">(기간)</span>
            <input type="date" name="end_date" className="rounded-lg border p-2" />
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
            제목
            <input
              type="text"
              name="title"
              required
              placeholder="1정 연수"
              className="rounded-lg border p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            구분
            <select name="category" defaultValue="기타" className="rounded-lg border p-2">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            등록
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={baseUrl(monthString(prev.year, prev.monthIndex), showClass)}
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            ← {prev.monthIndex + 1}월
          </Link>
          <h2 className="text-xl font-bold tabular-nums">
            {year}년 {monthIndex + 1}월
          </h2>
          <Link
            href={baseUrl(monthString(next.year, next.monthIndex), showClass)}
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            {next.monthIndex + 1}월 →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded px-1.5 py-0.5 bg-slate-200 text-slate-800">
            업무 일정
          </span>
          <span className="rounded px-1.5 py-0.5 bg-red-100 text-red-700">
            공문 기한
          </span>
          <Link
            href={baseUrl(thisMonth, !showClass)}
            className={`ml-auto rounded-full border px-3 py-1.5 font-medium transition-colors ${
              showClass
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {showClass ? "✓ 학급 일정 겹쳐보기" : "학급 일정 겹쳐보기"}
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white p-3 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {DAY_NAMES.map((name, i) => (
                  <th
                    key={name}
                    className={`border bg-slate-50 p-2 ${
                      i === 5 ? "text-blue-600" : i === 6 ? "text-red-500" : "text-slate-600"
                    }`}
                  >
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
                      className={`h-24 w-[14%] border p-1 align-top ${
                        date === today ? "bg-yellow-50" : ""
                      }`}
                    >
                      {date && (
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-xs tabular-nums ${date === today ? "font-bold" : "text-gray-500"}`}
                          >
                            {Number(date.slice(8))}
                          </span>
                          {(chipsByDate.get(date) ?? []).map((chip) =>
                            chip.deletableId ? (
                              <form
                                key={chip.key}
                                action={deleteWorkEvent}
                                className={`group flex items-center justify-between gap-1 rounded px-1 py-0.5 text-xs ${chip.style}`}
                              >
                                <input
                                  type="hidden"
                                  name="event_id"
                                  value={chip.deletableId}
                                />
                                <input type="hidden" name="month" value={thisMonth} />
                                <span className="truncate">{chip.label}</span>
                                <button
                                  type="submit"
                                  title="일정 삭제"
                                  className="hidden shrink-0 font-bold group-hover:inline"
                                >
                                  ×
                                </button>
                              </form>
                            ) : (
                              <span
                                key={chip.key}
                                title={chip.label}
                                className={`truncate rounded px-1 py-0.5 text-xs ${chip.style}`}
                              >
                                {chip.label}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400">
          업무 일정 위에 마우스를 올리면 × 로 삭제할 수 있어요. 공문 기한은
          공문 트래커에서 자동으로 표시됩니다.
        </p>
      </section>
    </main>
  );
}
