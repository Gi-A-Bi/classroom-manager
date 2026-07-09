import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DAY_NAMES,
  dayOfWeekMon1,
  daysBetween,
  formatKoreanDate,
  todayString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";
import { logout } from "../login/actions";

const CLASSROOM_MENU = [
  ["posts", "알림장"],
  ["students", "학생 명렬"],
  ["timetable", "시간표"],
  ["calendar", "캘린더"],
] as const;

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

  const [{ data: profile }, { data: years }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase
      .from("academic_years")
      .select("id, year, name, classrooms(id, name, class_code, theme_color)")
      .order("year", { ascending: false }),
  ]);

  const availableYears = years ?? [];
  // 학년도 선택: ?year= 파라미터, 없으면 가장 최근 학년도
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

  const [{ data: todaySlots }, { data: recentPosts }, { data: todayEvents }] =
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
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  // 히어로 D-day: 가장 가까운 다가오는 일정 (오늘 이후 시작)
  const { data: nextEvents } =
    classroomIds.length > 0
      ? await supabase
          .from("events")
          .select("title, event_date, layer")
          .in("classroom_id", classroomIds)
          .gt("event_date", today)
          .order("event_date")
          .limit(1)
      : { data: [] };
  const nextEvent = nextEvents?.[0] ?? null;
  const dday = nextEvent ? daysBetween(today, nextEvent.event_date) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-gray-500">
            {profile?.display_name || "선생님"} 선생님의 학급 관리
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight tabular-nums">
            {Number(today.slice(5, 7))}월 {Number(today.slice(8))}일{" "}
            <span className="text-2xl font-bold text-gray-400">
              {DAY_NAMES[todayDow - 1]}요일
            </span>
          </h1>
          {nextEvent && dday !== null && (
            <p className="flex items-center gap-2 text-sm">
              <span className="rounded-lg bg-gray-900 px-2 py-0.5 font-bold tabular-nums text-white">
                D-{dday}
              </span>
              <span className="font-medium">{nextEvent.title}</span>
              <span className="text-gray-400">
                {formatKoreanDate(nextEvent.event_date)}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/dashboard/settings"
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            ⚙️ 설정
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
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

      {availableYears.length > 1 && (
        <nav className="flex flex-wrap gap-1.5">
          {availableYears.map((y) => (
            <Link
              key={y.id}
              href={`/dashboard?year=${y.year}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                y.id === selectedYear?.id
                  ? "bg-gray-900 text-white"
                  : "border bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {y.name}
            </Link>
          ))}
        </nav>
      )}

      {classrooms.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-wide text-gray-400">
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
                className="overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`h-1.5 ${theme.topbar}`} />
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">
                      {c.name}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        학급코드{" "}
                        <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono font-bold">
                          {c.class_code}
                        </code>
                      </span>
                    </h3>
                    <nav className="flex gap-1">
                      {CLASSROOM_MENU.map(([key, label]) => (
                        <Link
                          key={key}
                          href={`/dashboard/classrooms/${c.id}/${key}`}
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                        >
                          {label}
                        </Link>
                      ))}
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
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          오늘 · {e.title}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-1 text-sm">
                    <span className="font-semibold text-gray-600">
                      오늘 시간표{isWeekday && ` (${DAY_NAMES[todayDow - 1]})`}
                    </span>
                    {isWeekday && slots.length > 0 ? (
                      <ol className="flex flex-wrap gap-1.5">
                        {slots.map((s) => (
                          <li
                            key={s.period}
                            className={`rounded-lg px-2.5 py-1 ${theme.soft}`}
                          >
                            <span
                              className={`font-bold tabular-nums ${theme.text}`}
                            >
                              {s.period}
                            </span>{" "}
                            <span className="font-medium">{s.subject}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <span className="text-gray-400">
                        {isWeekday
                          ? "✏️ 아직 시간표가 없어요 — 시간표 탭에서 입력해보세요"
                          : "🌤️ 주말이에요"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-sm">
                    <span className="font-semibold text-gray-600">
                      최근 알림장
                    </span>
                    {posts.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {posts.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/dashboard/classrooms/${c.id}/posts`}
                              className="text-blue-700 underline underline-offset-2"
                            >
                              {p.title}
                            </Link>{" "}
                            <span className="text-gray-400">
                              {formatKoreanDate(p.post_date)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400">
                        📝 아직 알림장이 없어요 — 오늘 첫 알림장을 써보세요
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center">
          <p className="text-3xl">🏫</p>
          <p className="text-gray-500">
            {selectedYear
              ? `${selectedYear.name}에 아직 학급이 없어요.`
              : "아직 학년도가 없어요."}
          </p>
          <Link
            href="/dashboard/settings"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            ⚙️ 설정에서 만들기
          </Link>
        </section>
      )}
    </main>
  );
}
