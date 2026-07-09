import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import {
  addMonths,
  DAY_NAMES,
  monthGrid,
  monthString,
  parseMonth,
  todayString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { createEvent, deleteEvent } from "./actions";

// 학교 일정=주황, 학급 일정=파랑
const LAYER_STYLE = {
  school: "bg-orange-100 text-orange-800",
  classroom: "bg-blue-100 text-blue-800",
} as const;

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const { id } = await params;
  const { month, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { year, monthIndex } = parseMonth(month);
  const thisMonth = monthString(year, monthIndex);
  const prev = addMonths(year, monthIndex, -1);
  const next = addMonths(year, monthIndex, 1);
  const weeks = monthGrid(year, monthIndex);
  const today = todayString();

  const [{ data: classroom }, { data: events }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, theme_color")
      .eq("id", id)
      .single(),
    supabase
      .from("events")
      .select("id, title, event_date, layer")
      .eq("classroom_id", id)
      .gte("event_date", `${thisMonth}-01`)
      .lte("event_date", `${thisMonth}-31`)
      .order("event_date"),
  ]);

  if (!classroom) notFound();

  const eventsByDate = new Map<string, NonNullable<typeof events>>();
  for (const e of events ?? []) {
    const list = eventsByDate.get(e.event_date) ?? [];
    list.push(e);
    eventsByDate.set(e.event_date, list);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <ClassroomNav classroomId={classroom.id} current="calendar" />

      <ClassroomHeader
        name={classroom.name}
        title="캘린더"
        themeColor={classroom.theme_color}
      />

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">일정 등록</h2>
        <form action={createEvent} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <input type="hidden" name="month" value={thisMonth} />
          <label className="flex flex-col gap-1 text-sm">
            날짜
            <input
              type="date"
              name="event_date"
              required
              defaultValue={today}
              className="rounded-md border p-2"
            />
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
            제목
            <input
              type="text"
              name="title"
              required
              placeholder="현장체험학습"
              className="rounded-md border p-2"
            />
          </label>
          <fieldset className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" name="layer" value="classroom" defaultChecked />
              <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                학급
              </span>
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="layer" value="school" />
              <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
                학교
              </span>
            </label>
          </fieldset>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            등록
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/classrooms/${classroom.id}/calendar?month=${monthString(prev.year, prev.monthIndex)}`}
            className="text-blue-600 underline"
          >
            ← 이전 달
          </Link>
          <h2 className="text-lg font-semibold">
            {year}년 {monthIndex + 1}월
          </h2>
          <Link
            href={`/dashboard/classrooms/${classroom.id}/calendar?month=${monthString(next.year, next.monthIndex)}`}
            className="text-blue-600 underline"
          >
            다음 달 →
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white p-3 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {DAY_NAMES.map((name) => (
                  <th key={name} className="border bg-gray-50 p-2">
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
                            className={`text-xs ${date === today ? "font-bold" : "text-gray-500"}`}
                          >
                            {Number(date.slice(8))}
                          </span>
                          {(eventsByDate.get(date) ?? []).map((e) => (
                            <form
                              key={e.id}
                              action={deleteEvent}
                              className={`group flex items-center justify-between gap-1 rounded px-1 py-0.5 text-xs ${LAYER_STYLE[e.layer as keyof typeof LAYER_STYLE]}`}
                            >
                              <input
                                type="hidden"
                                name="classroom_id"
                                value={classroom.id}
                              />
                              <input type="hidden" name="event_id" value={e.id} />
                              <input type="hidden" name="month" value={thisMonth} />
                              <span className="truncate">{e.title}</span>
                              <button
                                type="submit"
                                title="일정 삭제"
                                className="hidden shrink-0 font-bold group-hover:inline"
                              >
                                ×
                              </button>
                            </form>
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
        <p className="text-xs text-gray-500">
          일정 위에 마우스를 올리면 × 버튼으로 삭제할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
