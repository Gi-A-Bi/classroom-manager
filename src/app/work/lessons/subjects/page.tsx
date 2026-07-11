import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import { formatKoreanDate, weekStartString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function LessonSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; subject?: string }>;
}) {
  const { class: classParam, subject: subjectParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("id, name, academic_years(year)")
    .order("created_at", { ascending: false });

  const list = (classrooms ?? []).slice().sort((a, b) => {
    const ya = a.academic_years?.year ?? 0;
    const yb = b.academic_years?.year ?? 0;
    return yb - ya;
  });

  if (list.length === 0) {
    redirect("/work/lessons");
  }

  const classroom = list.find((c) => c.id === classParam) ?? list[0];

  const [{ data: subjects }, { data: plans }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name")
      .eq("classroom_id", classroom.id)
      .order("position"),
    supabase
      .from("lesson_plans")
      .select("id, plan_date, period, subject_id, unit, plan, note, done")
      .eq("classroom_id", classroom.id)
      .order("plan_date", { ascending: true })
      .order("period", { ascending: true }),
  ]);

  const selectedSubject = (subjects ?? []).find((s) => s.id === subjectParam);

  // 과목 필터 (없으면 과목이 지정된 계획 전부)
  const rows = (plans ?? []).filter((p) =>
    selectedSubject ? p.subject_id === selectedSubject.id : p.subject_id !== null,
  );

  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const buildUrl = (subjectId?: string) =>
    `/work/lessons/subjects?class=${classroom.id}${subjectId ? `&subject=${subjectId}` : ""}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="lessons" />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-display text-ink">📖 과목별 진도표</h1>
        <Link
          href={`/work/lessons?class=${classroom.id}&week=${weekStartString(
            new Date().toISOString().slice(0, 10),
          )}`}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
        >
          ← 주간 그리드
        </Link>
      </div>

      {list.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/work/lessons/subjects?class=${c.id}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                c.id === classroom.id
                  ? "bg-slate-700 text-white"
                  : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* 과목 필터 */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildUrl()}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !selectedSubject
              ? "bg-ink text-paper"
              : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
          }`}
        >
          전 과목
        </Link>
        {(subjects ?? []).map((s) => (
          <Link
            key={s.id}
            href={buildUrl(s.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedSubject?.id === s.id
                ? "bg-ink text-paper"
                : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <h2 className="text-xs font-bold tracking-wide text-ink-faint">
        {selectedSubject ? `${selectedSubject.name} · ` : "전 과목 · "}
        {rows.length}차시 (날짜순)
      </h2>

      {rows.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className={`flex flex-col gap-1 rounded-xl border border-line p-3.5 text-sm ${
                r.done ? "bg-slate-50" : "bg-paper"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-md bg-paper-soft text-xs font-bold tabular-nums text-ink-soft">
                  {i + 1}
                </span>
                {!selectedSubject && r.subject_id && (
                  <span className="rounded-full bg-paper-soft px-2 py-0.5 text-xs font-medium text-ink-soft">
                    {subjectName.get(r.subject_id)}
                  </span>
                )}
                <span className="font-semibold text-ink">
                  {r.unit || "(단원 미기재)"}
                </span>
                <span className="text-xs text-ink-faint tabular-nums">
                  {formatKoreanDate(r.plan_date)} · {r.period}교시
                </span>
                {r.done && (
                  <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                    ✓ 완료
                  </span>
                )}
              </div>
              {r.plan && (
                <p className="whitespace-pre-wrap text-ink-soft">{r.plan}</p>
              )}
              {r.note && (
                <p className="whitespace-pre-wrap rounded-lg bg-paper-soft p-2 text-xs text-ink-soft">
                  💬 {r.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center font-hand text-base text-ink-soft">
          아직 기록된 수업이 없어요.
        </p>
      )}
    </main>
  );
}
