import Link from "next/link";
import { redirect } from "next/navigation";
import { DAY_NAMES, dayOfWeekMon1, formatKoreanDate, todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
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
      .select("id, year, name, classrooms(id, name, class_code)")
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
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {profile?.display_name || "선생님"}의 학급 관리
        </h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 underline">
            로그아웃
          </button>
        </form>
      </header>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {classrooms.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">
            투데이 — {formatKoreanDate(today)}
          </h2>
          {classrooms.map((c) => {
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
              <div key={c.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {c.name}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      ({c.yearName}) · 학급코드{" "}
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-bold">
                        {c.class_code}
                      </code>
                    </span>
                  </h3>
                  <span className="flex gap-3 text-sm">
                    {CLASSROOM_MENU.map(([key, label]) => (
                      <Link
                        key={key}
                        href={`/dashboard/classrooms/${c.id}/${key}`}
                        className="text-blue-600 underline"
                      >
                        {label}
                      </Link>
                    ))}
                  </span>
                </div>

                {events.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {events.map((e) => (
                      <span
                        key={e.id}
                        className={`rounded px-2 py-1 text-sm font-medium ${
                          e.layer === "school"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        오늘: {e.title}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-sm">
                  <span className="font-medium">
                    오늘 시간표{isWeekday && ` (${DAY_NAMES[todayDow - 1]})`}
                  </span>
                  {isWeekday && slots.length > 0 ? (
                    <ol className="mt-1 flex flex-wrap gap-1.5">
                      {slots.map((s) => (
                        <li
                          key={s.period}
                          className="rounded bg-gray-100 px-2 py-1"
                        >
                          <span className="text-gray-500">{s.period}</span>{" "}
                          {s.subject}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <span className="ml-2 text-gray-500">
                      {isWeekday ? "미입력" : "주말"}
                    </span>
                  )}
                </div>

                <div className="text-sm">
                  <span className="font-medium">최근 알림장</span>
                  {posts.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-1">
                      {posts.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/dashboard/classrooms/${c.id}/posts`}
                            className="text-blue-600 underline"
                          >
                            {p.title}
                          </Link>{" "}
                          <span className="text-gray-500">
                            ({formatKoreanDate(p.post_date)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="ml-2 text-gray-500">없음</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">학년도 등록</h2>
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
              className="w-28 rounded-md border p-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            학년도 추가
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">학급 만들기</h2>
        {years && years.length > 0 ? (
          <form action={createClassroom} className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              학년도
              <select
                name="academic_year_id"
                required
                className="rounded-md border p-2"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              학급 이름
              <input
                type="text"
                name="name"
                required
                placeholder="3학년 2반"
                className="rounded-md border p-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              학급 생성
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">먼저 학년도를 등록해주세요.</p>
        )}
      </section>
    </main>
  );
}
