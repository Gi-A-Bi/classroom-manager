import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import {
  addDaysString,
  DAY_NAMES,
  todayString,
  weekStartString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { copyPreviousWeek } from "./actions";
import { WeekGrid, type Cell } from "./WeekGrid";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; week?: string; error?: string; msg?: string }>;
}) {
  const { class: classParam, week: weekParam, error, msg } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 교사의 학급 목록 (학년도 라벨 포함, 최신 학년도 먼저)
  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("id, name, periods_per_day, academic_years(year, name)")
    .order("created_at", { ascending: false });

  const list = (classrooms ?? []).slice().sort((a, b) => {
    const ya = a.academic_years?.year ?? 0;
    const yb = b.academic_years?.year ?? 0;
    return yb - ya;
  });

  if (list.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
        <WorkNav current="lessons" />
        <h1 className="text-2xl font-display text-ink">📖 수업</h1>
        <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center text-sm text-ink-soft">
          먼저 학급을 만들어야 수업 계획을 쓸 수 있어요.{" "}
          <Link href="/dashboard/settings" className="underline decoration-line-strong">
            학급 만들기
          </Link>
        </p>
      </main>
    );
  }

  const classroom = list.find((c) => c.id === classParam) ?? list[0];

  const today = todayString();
  const week =
    weekParam && DATE_RE.test(weekParam) ? weekStartString(weekParam) : weekStartString(today);
  const prevWeek = addDaysString(week, -7);
  const nextWeek = addDaysString(week, 7);

  // 월~금 5일
  const days = Array.from({ length: 5 }, (_, i) => {
    const date = addDaysString(week, i);
    return { date, label: DAY_NAMES[i], isToday: date === today };
  });
  const friday = days[4].date;

  const periodCount = classroom.periods_per_day ?? 6;
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  const [{ data: slots }, { data: subjects }, { data: plans }] = await Promise.all([
    supabase
      .from("timetable_slots")
      .select("day_of_week, period, subject")
      .eq("classroom_id", classroom.id),
    supabase
      .from("subjects")
      .select("id, name")
      .eq("classroom_id", classroom.id)
      .order("position"),
    supabase
      .from("lesson_plans")
      .select("id, plan_date, period, subject_id, unit, plan, note, done")
      .eq("classroom_id", classroom.id)
      .gte("plan_date", week)
      .lte("plan_date", friday),
  ]);

  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  // 시간표 배경: day_of_week(1~5)-period → 과목명
  const timetable = new Map(
    (slots ?? []).map((s) => [`${s.day_of_week}-${s.period}`, s.subject]),
  );
  // 저장된 계획: date-period → row
  const planByCell = new Map(
    (plans ?? []).map((p) => [`${p.plan_date}-${p.period}`, p]),
  );

  // cells[periodIndex][dayIndex]
  const cells: Cell[][] = periods.map((period) =>
    days.map((day, di) => {
      const p = planByCell.get(`${day.date}-${period}`);
      return {
        date: day.date,
        period,
        timetableSubject: timetable.get(`${di + 1}-${period}`) ?? null,
        plan: p
          ? {
              id: p.id,
              subjectId: p.subject_id,
              subjectName: p.subject_id ? (subjectName.get(p.subject_id) ?? null) : null,
              unit: p.unit,
              plan: p.plan,
              note: p.note,
              done: p.done,
            }
          : null,
      };
    }),
  );

  const doneCount = (plans ?? []).filter((p) => p.done).length;
  const planCount = plans?.length ?? 0;

  const weekUrl = (w: string) => `/work/lessons?class=${classroom.id}&week=${w}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-6">
      <WorkNav current="lessons" />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-display text-ink">📖 수업</h1>
        <Link
          href={`/work/lessons/subjects?class=${classroom.id}`}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
        >
          과목별 모아보기(진도표)
        </Link>
      </div>

      {/* 학급 선택 (여러 학급 운영 시) */}
      {list.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/work/lessons?class=${c.id}&week=${week}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                c.id === classroom.id
                  ? "bg-slate-700 text-white"
                  : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
              }`}
            >
              {c.name}
              <span className="ml-1 text-xs opacity-70">
                {c.academic_years?.year}
              </span>
            </Link>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {msg}
        </p>
      )}

      {/* 주 이동 + 요약 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={weekUrl(prevWeek)}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            ← 지난주
          </Link>
          <Link
            href={weekUrl(weekStartString(today))}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            오늘
          </Link>
          <Link
            href={weekUrl(nextWeek)}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            다음주 →
          </Link>
        </div>
        <span className="text-sm text-ink-soft">
          {classroom.name} · 계획 {planCount}칸
          {planCount > 0 && (
            <span className="tabular-nums"> · 완료 {doneCount}</span>
          )}
        </span>
      </div>

      <WeekGrid
        classroomId={classroom.id}
        week={week}
        days={days}
        periods={periods}
        cells={cells}
        subjects={(subjects ?? []).map((s) => ({ id: s.id, name: s.name }))}
      />

      {/* 정리 도구 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper p-4 text-sm">
        <form action={copyPreviousWeek}>
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <input type="hidden" name="week" value={week} />
          <button
            type="submit"
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-soft"
          >
            지난주 계획 이번 주로 복사
          </button>
        </form>
        <span className="text-xs text-ink-faint">
          같은 요일·교시의 빈 칸에만 과목·단원·계획을 복사해요(실행 메모·완료 제외).
          칸을 열면 다른 날짜/교시로 미룰 수 있어요.
        </span>
      </div>

      <p className="text-xs text-ink-faint">
        칸을 누르면 계획·기록을 쓰고, 오른쪽 위 체크로 계획대로 완료를 표시해요.
        시간표 과목이 배경으로 깔리고, 시간표에 없는 칸도 임시 수업으로 쓸 수 있어요.
      </p>
    </main>
  );
}
