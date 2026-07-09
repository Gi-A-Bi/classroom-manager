import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";
import { createAcademicYear, createClassroom } from "./actions";

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

  const currentYear = new Date().getMonth() + 1 >= 3
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
          <p className="text-sm text-gray-500">
            먼저 학년도를 등록해주세요.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">내 학급</h2>
        {years?.flatMap((y) =>
          y.classrooms.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/classrooms/${c.id}/students`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
            >
              <span>
                <span className="font-medium">{c.name}</span>{" "}
                <span className="text-sm text-gray-500">({y.name})</span>
              </span>
              <span className="text-sm">
                학급코드{" "}
                <code className="rounded bg-gray-100 px-2 py-1 font-mono font-bold">
                  {c.class_code}
                </code>
              </span>
            </Link>
          )),
        )}
        {(!years || years.every((y) => y.classrooms.length === 0)) && (
          <p className="text-sm text-gray-500">아직 만든 학급이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
