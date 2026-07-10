import { CalendarDays, ChevronRight, Clock, NotebookText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomNav } from "@/components/ClassroomNav";
import { CopyCodeChip } from "@/components/CopyCodeChip";
import {
  DAY_NAMES,
  dayOfWeekMon1,
  daysBetween,
  formatMonthDay,
  todayString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";

// 학급 메인 화면 — 교사가 학급을 열면 처음 보는 화면.
// 헤더(학년도·학급명·코드칩) + 탭 + 오늘 요약 카드 3장.
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

  const [
    { data: todayPost },
    { data: students },
    { data: slots },
    { data: nextEvents },
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
      .select("title, event_date")
      .eq("classroom_id", id)
      .gt("event_date", today)
      .order("event_date")
      .limit(1),
  ]);

  const totalStudents = students?.length ?? 0;
  const { count: readCount } = todayPost
    ? await supabase
        .from("post_reads")
        .select("id", { count: "exact", head: true })
        .eq("post_id", todayPost.id)
    : { count: 0 };

  const nextEvent = nextEvents?.[0] ?? null;
  const dday = nextEvent ? daysBetween(today, nextEvent.event_date) : null;

  const theme = getTheme(classroom.theme_color);
  const base = `/dashboard/classrooms/${id}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      {/* 헤더 */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink-faint">
            {classroom.academic_years?.name ?? ""}
          </span>
          <h1 className="font-display text-[34px] leading-none tracking-tight text-ink">
            {classroom.name}
          </h1>
        </div>
        <CopyCodeChip code={classroom.class_code} />
      </header>

      {/* 탭 (활성 탭 없음 — 홈) */}
      <ClassroomNav classroomId={id} current="" themeColor={classroom.theme_color} />

      {/* 오늘 요약 카드 3장 */}
      <section className="grid gap-3 sm:grid-cols-3">
        {/* 오늘 알림장 */}
        <Link
          href={`${base}/posts`}
          className="group flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">
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

        {/* 오늘 시간표 */}
        <Link
          href={`${base}/timetable`}
          className="group flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">
            <Clock size={15} strokeWidth={1.75} aria-hidden />
            오늘 시간표
            <span className="font-normal normal-case text-ink-faint">
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

        {/* 다음 일정 */}
        <Link
          href={`${base}/calendar`}
          className="group flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">
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

      <Link
        href={`${base}/posts`}
        className="flex items-center justify-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        학급 운영 시작하기
        <ChevronRight size={15} strokeWidth={2} aria-hidden />
      </Link>
    </main>
  );
}
