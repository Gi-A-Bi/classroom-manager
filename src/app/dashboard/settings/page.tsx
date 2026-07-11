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
        <Link href="/dashboard" className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
          ← 대시보드로
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-display text-ink">⚙️ 학급 설정</h1>
        <p className="mt-1 text-sm text-ink-soft">
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
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-ink">🗓️ 학년도 등록</h2>
          <form action={createAcademicYear} className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              연도
              <input
                type="number"
                name="year"
                required
                defaultValue={currentYear}
                min={2000}
                max={2100}
                className="w-28 rounded-lg border border-line bg-paper-soft p-2 text-ink"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
            >
              추가
            </button>
          </form>
          <p className="text-xs text-ink-faint">
            매년 3월 새 학년도를 추가하면 이전 학년도 기록은 그대로 보관됩니다.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-ink">🏫 학급 만들기</h2>
          {years && years.length > 0 ? (
            <form action={createClassroom} className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <label className="flex flex-col gap-1 text-sm text-ink-soft">
                  학년도
                  <select
                    name="academic_year_id"
                    required
                    className="rounded-lg border border-line bg-paper-soft p-2 text-ink"
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm text-ink-soft">
                  학급 이름
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="3학년 2반"
                    className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
                  />
                </label>
              </div>
              <fieldset className="flex flex-col gap-1.5 text-sm text-ink-soft">
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
                        className={`block h-8 w-8 rounded-full ${THEMES[key].swatch} ring-offset-2 transition-transform hover:scale-110 peer-checked:ring-2 peer-checked:ring-ink`}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
              >
                학급 생성
              </button>
            </form>
          ) : (
            <p className="text-sm text-ink-soft">먼저 학년도를 등록해주세요.</p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wide text-ink-faint">
          📚 전체 학급
        </h2>
        {years?.flatMap((y) =>
          y.classrooms.map((c) => {
            const theme = getTheme(c.theme_color);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-line bg-paper p-4"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full ${theme.swatch}`}
                  />
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-sm text-ink-faint">{y.name}</span>
                  <code className="rounded-md bg-paper-soft px-1.5 py-0.5 font-mono text-sm font-bold text-ink">
                    {c.class_code}
                  </code>
                </span>
                <Link
                  href={`/dashboard?year=${y.year}`}
                  className="text-sm text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink"
                >
                  대시보드에서 열기
                </Link>
              </div>
            );
          }),
        )}
        {(!years || years.every((y) => y.classrooms.length === 0)) && (
          <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-6 text-center font-hand text-base text-ink-soft">
            🏫 아직 학급이 없어요. 위에서 첫 학급을 만들어보세요.
          </p>
        )}
      </section>
    </main>
  );
}
