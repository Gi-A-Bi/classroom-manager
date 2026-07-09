import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTheme, THEME_KEYS, THEMES } from "@/lib/themes";
import { createAcademicYear, createClassroom } from "../actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: years } = await supabase
    .from("academic_years")
    .select("id, year, name, classrooms(id, name, class_code, theme_color)")
    .order("year", { ascending: false });

  const currentYear =
    new Date().getMonth() + 1 >= 3
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <nav className="text-sm">
        <Link href="/dashboard" className="text-blue-600 underline">
          ← 대시보드로
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">⚙️ 학급 설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          학년도와 학급을 만들고 관리하는 곳이에요.
        </p>
      </header>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">🗓️ 학년도 등록</h2>
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              추가
            </button>
          </form>
          <p className="text-xs text-gray-400">
            매년 3월 새 학년도를 추가하면 이전 학년도 기록은 그대로 보관됩니다.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">🏫 학급 만들기</h2>
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
                    <label
                      key={key}
                      className="cursor-pointer"
                      title={THEMES[key].label}
                    >
                      <input
                        type="radio"
                        name="theme_color"
                        value={key}
                        defaultChecked={i === 0}
                        className="peer sr-only"
                      />
                      <span
                        className={`block h-8 w-8 rounded-full ${THEMES[key].swatch} ring-offset-2 transition-transform hover:scale-110 peer-checked:ring-2 peer-checked:ring-gray-800`}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                학급 생성
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">먼저 학년도를 등록해주세요.</p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wide text-gray-400">
          📚 전체 학급
        </h2>
        {years?.flatMap((y) =>
          y.classrooms.map((c) => {
            const theme = getTheme(c.theme_color);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full ${theme.swatch}`}
                  />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-gray-400">{y.name}</span>
                  <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-sm font-bold">
                    {c.class_code}
                  </code>
                </span>
                <Link
                  href={`/dashboard?year=${y.year}`}
                  className="text-sm text-blue-600 underline"
                >
                  대시보드에서 열기
                </Link>
              </div>
            );
          }),
        )}
        {(!years || years.every((y) => y.classrooms.length === 0)) && (
          <p className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-gray-400">
            🏫 아직 학급이 없어요. 위에서 첫 학급을 만들어보세요.
          </p>
        )}
      </section>
    </main>
  );
}
