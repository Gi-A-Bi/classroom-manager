import {
  CalendarDays,
  ExternalLink,
  ListChecks,
  LogOut,
  NotebookPen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CLASSROOM_MENU } from "@/components/ClassroomNav";
import { ModeSwitch } from "@/components/ModeSwitch";
import { Wordmark } from "@/components/Wordmark";
import {
  DAY_NAMES,
  dayOfWeekMon1,
  daysBetween,
  formatKoreanDate,
  formatMonthDay,
  todayString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";
import { logout } from "../login/actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; year?: string }>;
}) {
  const { error, year: yearParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: years }, { data: todos }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, onboarded_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("academic_years")
        .select("id, year, name, classrooms(id, name, class_code, theme_color)")
        .order("year", { ascending: false }),
      supabase
        .from("work_todos")
        .select("id, title, due_date, repeat_dow, done_at, last_done_date")
        .order("priority")
        .order("due_date", { nullsFirst: false }),
    ]);

  const availableYears = years ?? [];

  // 첫 가입 교사(온보딩 전 + 학급 0개)는 환영 안내로
  const totalClassrooms = availableYears.reduce(
    (n, y) => n + y.classrooms.length,
    0,
  );
  if (!profile?.onboarded_at && totalClassrooms === 0) {
    redirect("/welcome");
  }

  const selectedYear =
    availableYears.find((y) => String(y.year) === yearParam) ??
    availableYears[0] ??
    null;

  const classrooms =
    selectedYear?.classrooms.map((c) => ({
      ...c,
      yearName: selectedYear.name,
    })) ?? [];
  const classroomIds = classrooms.map((c) => c.id);

  const today = todayString();
  const todayDow = dayOfWeekMon1();
  const isWeekday = todayDow <= 5;

  const [
    { data: todaySlots },
    { data: recentPosts },
    { data: todayEvents },
    { data: todayPosts },
  ] =
    classroomIds.length > 0
      ? await Promise.all([
          isWeekday
            ? supabase
                .from("timetable_slots")
                .select("classroom_id, period, subject")
                .in("classroom_id", classroomIds)
                .eq("day_of_week", todayDow)
                .order("period")
            : Promise.resolve({
                data: [] as {
                  classroom_id: string;
                  period: number;
                  subject: string;
                }[],
              }),
          supabase
            .from("posts")
            .select("id, classroom_id, title, post_date")
            .in("classroom_id", classroomIds)
            .order("post_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("events")
            .select("id, classroom_id, title, layer")
            .in("classroom_id", classroomIds)
            .lte("event_date", today)
            .or(`end_date.gte.${today},event_date.eq.${today}`),
          supabase
            .from("posts")
            .select("classroom_id")
            .in("classroom_id", classroomIds)
            .eq("post_date", today),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const { data: nextEvents } =
    classroomIds.length > 0
      ? await supabase
          .from("events")
          .select("title, event_date")
          .in("classroom_id", classroomIds)
          .gt("event_date", today)
          .order("event_date")
          .limit(1)
      : { data: [] };
  const nextEvent = nextEvents?.[0] ?? null;
  const dday = nextEvent ? daysBetween(today, nextEvent.event_date) : null;

  // 등록한 도구 전부 — 즐겨찾기 먼저, 그다음 서랍 순서
  const { data: myTools } = await supabase
    .from("class_tools")
    .select("id, name, url, color, is_favorite")
    .order("is_favorite", { ascending: false })
    .order("position");

  // 오늘 할 일 (반복은 오늘 요일, 단발성은 마감이 오늘이거나 지난 미완료)
  const todoDone = (t: NonNullable<typeof todos>[number]) =>
    t.repeat_dow ? t.last_done_date === today : t.done_at !== null;
  const todayTodos = (todos ?? []).filter((t) =>
    t.repeat_dow
      ? t.repeat_dow === todayDow
      : !t.done_at && t.due_date !== null && t.due_date <= today,
  );
  const remainingTodos = todayTodos.filter((t) => !todoDone(t));

  // 오늘 알림장 작성 현황
  const writtenClassrooms = new Set(
    (todayPosts ?? []).map((p) => p.classroom_id),
  );
  const firstClassroom = classrooms[0];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6">
      {/* 헤더 — 큰 날짜 제목 + 손그림 밑줄 */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Wordmark size="sm" className="opacity-60" />
          <span className="text-sm font-medium text-ink-faint">
            {profile?.display_name || "선생님"} 선생님, 안녕하세요
          </span>
          <h1 className="font-display text-5xl leading-none tracking-tight text-ink tabular-nums">
            {Number(today.slice(5, 7))}월 {Number(today.slice(8))}일{" "}
            <span className="text-3xl text-ink-faint">
              {DAY_NAMES[todayDow - 1]}요일
            </span>
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <ModeSwitch current="class" />
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            <Settings size={15} strokeWidth={1.75} aria-hidden />
            설정
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
            >
              <LogOut size={15} strokeWidth={1.75} aria-hidden />
              로그아웃
            </button>
          </form>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 도구 바로가기 — 도구 서랍에 등록한 카드 전부 (즐겨찾기 먼저) */}
      {myTools && myTools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {myTools.map((t) => {
            const tt = getTheme(t.color);
            return (
              <a
                key={t.id}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-transform hover:scale-105 ${tt.soft} ${tt.text}`}
              >
                {t.is_favorite ? (
                  <span aria-hidden className="text-xs">
                    ★
                  </span>
                ) : (
                  <ExternalLink size={15} strokeWidth={2} aria-hidden />
                )}
                {t.name}
              </a>
            );
          })}
        </div>
      )}

      {/* 오늘 요약 카드 3장 */}
      <section className="grid gap-3 sm:grid-cols-3">
        {/* 할 일 */}
        <Link
          href="/work/todos"
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-faint">
            <ListChecks size={15} strokeWidth={1.75} aria-hidden />
            오늘 할 일
          </span>
          {remainingTodos.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {remainingTodos.slice(0, 3).map((t) => (
                <li key={t.id} className="line-clamp-1 text-sm text-ink">
                  · {t.title}
                </li>
              ))}
              {remainingTodos.length > 3 && (
                <li className="text-xs text-ink-faint">
                  외 {remainingTodos.length - 3}개
                </li>
              )}
            </ul>
          ) : (
            <span className="mt-auto font-hand text-base text-ink-soft">
              {todayTodos.length > 0 ? "다 했어요! 👏" : "할 일이 없어요"}
            </span>
          )}
        </Link>

        {/* 알림장 쓰기 */}
        <Link
          href={
            firstClassroom
              ? `/dashboard/classrooms/${firstClassroom.id}/posts`
              : "/dashboard/settings"
          }
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-faint">
            <NotebookPen size={15} strokeWidth={1.75} aria-hidden />
            오늘 알림장
          </span>
          {classrooms.length > 0 ? (
            <span className="mt-auto text-sm text-ink-soft">
              작성{" "}
              <strong className="tabular-nums text-ink">
                {writtenClassrooms.size}
              </strong>
              <span className="text-ink-faint">/{classrooms.length} 반</span>
              {writtenClassrooms.size < classrooms.length && (
                <span className="ml-1 font-hand text-ink-soft">— 쓰러 가기</span>
              )}
            </span>
          ) : (
            <span className="mt-auto font-hand text-base text-ink-soft">
              먼저 학급을 만들어요
            </span>
          )}
        </Link>

        {/* 오늘 일정 */}
        <Link
          href={
            firstClassroom
              ? `/dashboard/classrooms/${firstClassroom.id}/calendar`
              : "/dashboard/settings"
          }
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 transition-colors hover:bg-paper-soft"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-faint">
            <CalendarDays size={15} strokeWidth={1.75} aria-hidden />
            오늘 일정
          </span>
          {todayEvents && todayEvents.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {todayEvents.slice(0, 3).map((e) => (
                <li key={e.id} className="line-clamp-1 text-sm text-ink">
                  · {e.title}
                </li>
              ))}
            </ul>
          ) : nextEvent && dday !== null ? (
            <span className="mt-auto flex items-center gap-2 text-sm">
              <span className="rounded-lg bg-ink px-2 py-0.5 font-bold tabular-nums text-paper">
                D-{dday}
              </span>
              <span className="truncate text-ink-soft">{nextEvent.title}</span>
            </span>
          ) : (
            <span className="mt-auto font-hand text-base text-ink-soft">
              오늘 일정이 없어요
            </span>
          )}
        </Link>
      </section>

      {/* 학년도 탭 */}
      {availableYears.length > 1 && (
        <nav className="flex flex-wrap gap-1.5">
          {availableYears.map((y) => (
            <Link
              key={y.id}
              href={`/dashboard?year=${y.year}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                y.id === selectedYear?.id
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
              }`}
            >
              {y.name}
            </Link>
          ))}
        </nav>
      )}

      {/* 오늘의 학급 */}
      {classrooms.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-faint">
            {selectedYear?.name}의 학급
          </h2>
          {classrooms.map((c) => {
            const theme = getTheme(c.theme_color);
            const slots = (todaySlots ?? []).filter(
              (s) => s.classroom_id === c.id,
            );
            const posts = (recentPosts ?? [])
              .filter((p) => p.classroom_id === c.id)
              .slice(0, 2);
            const events = (todayEvents ?? []).filter(
              (e) => e.classroom_id === c.id,
            );

            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-line bg-paper"
              >
                <div className={`h-1.5 ${theme.topbar}`} />
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-ink">
                      <Link
                        href={`/dashboard/classrooms/${c.id}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>{" "}
                      <code className="ml-1 rounded-md bg-paper-soft px-1.5 py-0.5 font-mono text-sm font-bold tracking-wider text-ink-soft">
                        {c.class_code}
                      </code>
                    </h3>
                    <nav className="flex flex-wrap gap-x-3 gap-y-1.5">
                      {CLASSROOM_MENU.map((m) => {
                        const Icon = m.icon;
                        return (
                          <Link
                            key={m.key}
                            href={`/dashboard/classrooms/${c.id}/${m.key}`}
                            className="flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                          >
                            <Icon size={15} strokeWidth={1.75} aria-hidden />
                            {m.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  {events.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {events.map((e) => (
                        <span
                          key={e.id}
                          className={`rounded-lg px-2.5 py-1 text-sm font-medium ${
                            e.layer === "school"
                              ? "bg-orange-100 text-orange-800"
                              : `${theme.soft} ${theme.text}`
                          }`}
                        >
                          오늘 · {e.title}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-1 text-sm">
                    <span className="font-semibold text-ink-soft">
                      오늘 시간표{isWeekday && ` (${DAY_NAMES[todayDow - 1]})`}
                    </span>
                    {isWeekday && slots.length > 0 ? (
                      <ol className="flex flex-wrap gap-1.5">
                        {slots.map((s) => (
                          <li
                            key={s.period}
                            className={`rounded-lg px-2.5 py-1 ${theme.soft} ${theme.text}`}
                          >
                            <span className="font-bold tabular-nums">
                              {s.period}
                            </span>{" "}
                            <span className="font-medium">{s.subject}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <span className="font-hand text-base text-ink-soft">
                        {isWeekday
                          ? "아직 시간표가 없어요"
                          : "주말이에요 🌤️"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-sm">
                    <span className="font-semibold text-ink-soft">
                      최근 알림장
                    </span>
                    {posts.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {posts.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/dashboard/classrooms/${c.id}/posts`}
                              className="font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                            >
                              {p.title}
                            </Link>{" "}
                            <span className="text-ink-faint tabular-nums">
                              {formatMonthDay(p.post_date)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="font-hand text-base text-ink-soft">
                        아직 알림장이 없어요 — 첫 알림장을 써보세요
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-10 text-center">
          <p className="text-3xl">🏫</p>
          <p className="font-hand text-lg text-ink-soft">
            {selectedYear
              ? `${selectedYear.name}에 아직 학급이 없어요.`
              : "아직 학년도가 없어요."}
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            <Settings size={15} strokeWidth={1.75} aria-hidden />
            설정에서 만들기
          </Link>
        </section>
      )}
    </main>
  );
}
