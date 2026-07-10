import { CalendarDays, Clock, NotebookText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomNav } from "@/components/ClassroomNav";
import { CopyCodeChip } from "@/components/CopyCodeChip";
import {
  DAY_NAMES,
  dateRange,
  dayOfWeekMon1,
  daysBetween,
  formatMonthDay,
  monthEndString,
  monthGrid,
  parseMonth,
  todayString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";

// 학급 메인 화면 — 헤더 + 탭 + 오늘 요약 카드 3장 + 이번 달 달력(주인공) + 최근 알림장.
export default async function ClassroomHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, class_code, theme_color, academic_years(name)")
    .eq("id", id)
    .single();
  if (!classroom) notFound();

  const today = todayString();
  const todayDow = dayOfWeekMon1();
  const isWeekday = todayDow <= 5;
  const { year, monthIndex } = parseMonth();
  const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const monthEnd = monthEndString(year, monthIndex);
  const weeks = monthGrid(year, monthIndex);

  const [
    { data: todayPost },
    { data: students },
    { data: slots },
    { data: monthEvents },
    { data: recentPosts },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, post_date")
      .eq("classroom_id", id)
      .eq("post_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("students")
      .select("id", { count: "exact" })
      .eq("classroom_id", id),
    isWeekday
      ? supabase
          .from("timetable_slots")
          .select("period, subject")
          .eq("classroom_id", id)
          .eq("day_of_week", todayDow)
          .order("period")
      : Promise.resolve({ data: [] as { period: number; subject: string }[] }),
    supabase
      .from("events")
      .select("id, title, event_date, end_date, layer")
      .eq("classroom_id", id)
      .lte("event_date", monthEnd)
      .or(`end_date.gte.${monthStart},event_date.gte.${monthStart}`),
    supabase
      .from("posts")
      .select("id, title, post_date")
      .eq("classroom_id", id)
      .order("post_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalStudents = students?.length ?? 0;
  const { count: readCount } = todayPost
    ? await supabase
        .from("post_reads")
        .select("id", { count: "exact", head: true })
        .eq("post_id", todayPost.id)
    : { count: 0 };

  const theme = getTheme(classroom.theme_color);
  const base = `/dashboard/classrooms/${id}`;

  // 다음 일정 (오늘 이후 첫 일정)
  const upcoming = (monthEvents ?? [])
    .filter((e) => e.event_date > today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const nextEvent = upcoming[0] ?? null;
  const dday = nextEvent ? daysBetween(today, nextEvent.event_date) : null;

  // 달력 날짜별 일정 (기간 일정은 매일 펼침)
  const eventsByDate = new Map<string, NonNullable<typeof monthEvents>>();
  for (const e of monthEvents ?? []) {
    const from = e.event_date < monthStart ? monthStart : e.event_date;
    const to = (e.end_date ?? e.event_date) > monthEnd ? monthEnd : e.end_date ?? e.event_date;
    for (const d of dateRange(from, to)) {
      const list = eventsByDate.get(d) ?? [];
      list.push(e);
      eventsByDate.set(d, list);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6">
      {/* 헤더 — 큰 제목 + 손그림 밑줄(테마색) */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink-faint">
            {classroom.academic_years?.name ?? ""}
          </span>
          <div className="relative inline-block pb-2">
            <h1 className="font-display text-5xl leading-none tracking-tight text-ink">
              {classroom.name}
            </h1>
            {/* 손으로 그은 듯한 밑줄 */}
            <svg
              className={`absolute -bottom-0.5 left-0 w-full ${theme.text}`}
              height="9"
              viewBox="0 0 200 9"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 5.5 Q 45 1.5 90 4.5 T 175 4 T 197 3.5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <CopyCodeChip code={classroom.class_code} />
      </header>

      {/* 탭 (활성 없음 — 홈) */}
      <ClassroomNav classroomId={id} current="" themeColor={classroom.theme_color} />

      {/* 오늘 요약 카드 3장 */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Link
          href={`${base}/posts`}
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-faint">
            <NotebookText size={15} strokeWidth={1.75} aria-hidden />
            오늘 알림장
          </span>
          {todayPost ? (
            <>
              <span className="line-clamp-2 font-semibold text-ink">
                {todayPost.title}
              </span>
              <span className="mt-auto text-sm text-ink-soft">
                읽음{" "}
                <strong className={`tabular-nums ${theme.text}`}>
                  {readCount ?? 0}
                </strong>
                <span className="text-ink-faint">/{totalStudents}</span>
              </span>
            </>
          ) : (
            <span className="mt-auto font-hand text-base text-ink-soft">
              아직 없어요 — 써볼까요?
            </span>
          )}
        </Link>

        <Link
          href={`${base}/timetable`}
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-faint">
            <Clock size={15} strokeWidth={1.75} aria-hidden />
            오늘 시간표
            <span className="font-normal text-ink-faint">
              {DAY_NAMES[todayDow - 1]}
            </span>
          </span>
          {isWeekday && slots && slots.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {slots.map((s) => (
                <span
                  key={s.period}
                  className={`rounded-lg px-2 py-0.5 text-sm ${theme.soft} ${theme.text}`}
                >
                  <span className="font-bold tabular-nums">{s.period}</span>{" "}
                  {s.subject}
                </span>
              ))}
            </div>
          ) : (
            <span className="mt-auto font-hand text-base text-ink-soft">
              {isWeekday ? "아직 없어요" : "쉬는 날이에요"}
            </span>
          )}
        </Link>

        <Link
          href={`${base}/calendar`}
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-faint">
            <CalendarDays size={15} strokeWidth={1.75} aria-hidden />
            다음 일정
          </span>
          {nextEvent && dday !== null ? (
            <>
              <span className="line-clamp-2 font-semibold text-ink">
                {nextEvent.title}
              </span>
              <span className="mt-auto flex items-center gap-2 text-sm">
                <span
                  className={`rounded-lg px-2 py-0.5 font-bold tabular-nums ${theme.soft} ${theme.text}`}
                >
                  D-{dday}
                </span>
                <span className="text-ink-faint tabular-nums">
                  {formatMonthDay(nextEvent.event_date)}
                </span>
              </span>
            </>
          ) : (
            <span className="mt-auto font-hand text-base text-ink-soft">
              다가오는 일정이 없어요
            </span>
          )}
        </Link>
      </section>

      {/* 본문: 이번 달 달력(주인공) + 최근 알림장 */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* 이번 달 달력 */}
        <div className="flex flex-col gap-2 md:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-4xl leading-none text-ink">
              <span className="relative inline-block">
                <span
                  aria-hidden
                  className={`absolute inset-x-[-2px] bottom-0.5 -z-10 h-3.5 -rotate-1 rounded-sm ${theme.soft}`}
                />
                {monthIndex + 1}월
              </span>
              <span className="ml-2 font-sans text-sm font-normal text-ink-faint">
                {year}
              </span>
            </h2>
            <Link
              href={`${base}/calendar`}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              전체 캘린더 →
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {DAY_NAMES.map((d, i) => (
                    <th
                      key={d}
                      className={`border-b border-line py-1.5 font-medium ${
                        i === 5 ? "text-blue-500" : i === 6 ? "text-rose-400" : "text-ink-faint"
                      }`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((date, di) => {
                      const dayEvents = date ? eventsByDate.get(date) ?? [] : [];
                      const isToday = date === today;
                      return (
                        <td
                          key={di}
                          className="h-16 w-[14.28%] border border-line/60 align-top"
                        >
                          {date && (
                            <div className="flex h-full flex-col gap-0.5 p-1">
                              <span
                                className={`text-[11px] tabular-nums ${
                                  isToday
                                    ? `inline-flex h-5 w-5 items-center justify-center rounded-full ${theme.soft} font-bold ${theme.text}`
                                    : "text-ink-soft"
                                }`}
                              >
                                {Number(date.slice(8))}
                              </span>
                              {dayEvents.slice(0, 2).map((e) => (
                                <span
                                  key={e.id}
                                  title={e.title}
                                  className={`truncate rounded px-1 text-[10px] leading-tight ${
                                    e.layer === "school"
                                      ? "bg-orange-100 text-orange-800"
                                      : `${theme.soft} ${theme.text}`
                                  }`}
                                >
                                  {e.title}
                                </span>
                              ))}
                              {dayEvents.length > 2 && (
                                <span className="px-1 text-[10px] text-ink-faint">
                                  +{dayEvents.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 최근 알림장 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl leading-none text-ink">
              최근 알림장
            </h2>
            <Link
              href={`${base}/posts`}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              더보기 →
            </Link>
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-line bg-paper p-3">
            {recentPosts && recentPosts.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {recentPosts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${base}/posts`}
                      className="flex items-center justify-between gap-2 py-2.5 transition-colors hover:text-ink"
                    >
                      <span className="line-clamp-1 text-sm font-medium text-ink">
                        {p.title}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                        {formatMonthDay(p.post_date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
                <span className="text-2xl">📮</span>
                <span className="font-hand text-base text-ink-soft">
                  첫 알림장을 써보세요!
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
