import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
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
import { createClient } from "@/lib/supabase/server";
import {
  bulkCreateEvents,
  createEvent,
  deleteEvent,
  disableShare,
  enableShare,
} from "./actions";
import { BulkScheduleImport } from "./BulkScheduleImport";

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
  searchParams: Promise<{ month?: string; error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { month, error, success } = await searchParams;

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

  const [{ data: classroom }, { data: events }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, theme_color, share_token, academic_years(year)")
      .eq("id", id)
      .single(),
    supabase
      .from("events")
      .select("id, title, event_date, end_date, layer")
      .eq("classroom_id", id)
      .lte("event_date", monthEnd)
      .or(`end_date.gte.${monthStart},event_date.gte.${monthStart}`)
      .order("event_date"),
  ]);

  if (!classroom) notFound();

  const academicYear = classroom.academic_years?.year ?? year;

  // 기간 일정은 달력의 해당 날짜마다 펼쳐서 표시
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

  const host = (await headers()).get("host") ?? "localhost:3300";
  const proto = host.startsWith("localhost") || host.startsWith("127.")
    ? "http"
    : "https";
  const shareUrl = classroom.share_token
    ? `${proto}://${host}/share/calendar/${classroom.share_token}`
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="calendar"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="캘린더"
        themeColor={classroom.theme_color}
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">📌 일정 등록</h2>
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
              className="rounded-lg border p-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            종료일 <span className="text-xs text-gray-400">(기간일 때만)</span>
            <input type="date" name="end_date" className="rounded-lg border p-2" />
          </label>
          <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm">
            제목
            <input
              type="text"
              name="title"
              required
              placeholder="현장체험학습"
              className="rounded-lg border p-2"
            />
          </label>
          <fieldset className="flex items-center gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-1">
              <input type="radio" name="layer" value="classroom" defaultChecked />
              <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                학급
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-1">
              <input type="radio" name="layer" value="school" />
              <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
                학교
              </span>
            </label>
          </fieldset>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            등록
          </button>
        </form>
      </section>

      <BulkScheduleImport
        classroomId={classroom.id}
        academicYear={academicYear}
        month={thisMonth}
      />

      <section className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            🔗 학부모 공유 링크{" "}
            <span className="text-sm font-normal text-gray-500">
              로그인 없이 캘린더만 볼 수 있는 읽기 전용 주소
            </span>
          </h2>
          <div className="flex gap-2">
            {shareUrl ? (
              <>
                <form action={enableShare}>
                  <input type="hidden" name="classroom_id" value={classroom.id} />
                  <input type="hidden" name="month" value={thisMonth} />
                  <button
                    type="submit"
                    className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    재발급
                  </button>
                </form>
                <form action={disableShare}>
                  <input type="hidden" name="classroom_id" value={classroom.id} />
                  <input type="hidden" name="month" value={thisMonth} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    공유 끄기
                  </button>
                </form>
              </>
            ) : (
              <form action={enableShare}>
                <input type="hidden" name="classroom_id" value={classroom.id} />
                <input type="hidden" name="month" value={thisMonth} />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  공유 켜기
                </button>
              </form>
            )}
          </div>
        </div>
        {shareUrl && (
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={undefined}
            className="w-full rounded-lg border bg-gray-50 p-2 font-mono text-xs text-gray-700"
          />
        )}
        {shareUrl && (
          <p className="text-xs text-gray-500">
            이 주소를 아는 사람은 누구나 캘린더를 볼 수 있어요. 주소를 바꾸려면
            재발급, 공유를 멈추려면 공유 끄기를 누르세요.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/classrooms/${classroom.id}/calendar?month=${monthString(prev.year, prev.monthIndex)}`}
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            ← {prev.monthIndex + 1}월
          </Link>
          <h2 className="text-xl font-bold tabular-nums">
            {year}년 {monthIndex + 1}월
          </h2>
          <Link
            href={`/dashboard/classrooms/${classroom.id}/calendar?month=${monthString(next.year, next.monthIndex)}`}
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            {next.monthIndex + 1}월 →
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white p-3 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {DAY_NAMES.map((name, i) => (
                  <th
                    key={name}
                    className={`border bg-gray-50 p-2 ${
                      i === 5 ? "text-blue-600" : i === 6 ? "text-red-500" : ""
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
                          {(eventsByDate.get(date) ?? []).map((e) => (
                            <form
                              key={e.id}
                              action={deleteEvent}
                              className={`group flex items-center justify-between gap-1 rounded px-1 py-0.5 text-xs transition-opacity ${LAYER_STYLE[e.layer as keyof typeof LAYER_STYLE]}`}
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
        <p className="text-xs text-gray-400">
          일정 위에 마우스를 올리면 × 버튼으로 삭제할 수 있습니다. 기간 일정
          (예: {formatMonthDay(monthStart)}~)은 해당 기간의 모든 날짜에
          표시됩니다.
        </p>
      </section>
    </main>
  );
}
