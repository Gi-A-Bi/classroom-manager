import Link from "next/link";
import { redirect } from "next/navigation";
import { DAY_NAMES, dayOfWeekMon1, formatKoreanDate, todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTheme, THEME_KEYS, THEMES } from "@/lib/themes";
import { logout } from "../login/actions";
import { createAcademicYear, createClassroom } from "./actions";

const CLASSROOM_MENU = [
  ["posts", "알림장"],
  ["students", "학생 명렬"],
  ["timetable", "시간표"],
  ["calendar", "캘린더"],
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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

  const classrooms =
    years?.flatMap((y) =>
      y.classrooms.map((c) => ({ ...c, yearName: y.name })),
    ) ?? [];
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
            .eq("event_date", today),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const currentYear =
    new Date().getMonth() + 1 >= 3
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {profile?.display_name || "선생님"}의 학급 관리
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            로그아웃
          </button>
        </form>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {classrooms.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-500">
            투데이 · {formatKoreanDate(today)}
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
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                <div className={`h-1.5 ${theme.topbar}`} />
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">
                      {c.name}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        {c.yearName} · 학급코드{" "}
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
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
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
                            <span className="text-gray-500">{s.period}</span>{" "}
                            <span className="font-medium">{s.subject}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <span className="text-gray-400">
                        {isWeekday ? "아직 입력 전" : "주말"}
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
                      <span className="text-gray-400">아직 없음</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-500">학급 관리</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">학년도 등록</h3>
            <form action={createAcademicYear} className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-sm">
                연도
                <input
                  type="number"
                  name="year"
                  required
                  defaultValue={currentYear}
                  min={2000}
                  max={2100}
                  className="w-28 rounded-lg border p-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                추가
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold">학급 만들기</h3>
            {years && years.length > 0 ? (
              <form action={createClassroom} className="flex flex-col gap-3">
                <div className="flex items-end gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    학년도
                    <select
                      name="academic_year_id"
                      required
                      className="rounded-lg border p-2"
                    >
                      {years.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    학급 이름
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="3학년 2반"
                      className="rounded-lg border p-2"
                    />
                  </label>
                </div>
                <fieldset className="flex flex-col gap-1.5 text-sm">
                  <legend className="mb-1">테마 색</legend>
                  <div className="flex flex-wrap gap-2">
                    {THEME_KEYS.map((key, i) => (
                      <label key={key} className="cursor-pointer" title={THEMES[key].label}>
                        <input
                          type="radio"
                          name="theme_color"
                          value={key}
                          defaultChecked={i === 0}
                          className="peer sr-only"
                        />
                        <span
                          className={`block h-8 w-8 rounded-full ${THEMES[key].swatch} ring-offset-2 peer-checked:ring-2 peer-checked:ring-gray-800`}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="submit"
                  className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  학급 생성
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-500">먼저 학년도를 등록해주세요.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
