import Link from "next/link";
import { redirect } from "next/navigation";
import { EditableNote } from "@/components/EditableNote";
import { PrintButton } from "@/components/PrintButton";
import {
  addDaysString,
  DAY_NAMES,
  dateRange,
  formatMonthDay,
  todayString,
  weekStartString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function WeeklyGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; week?: string }>;
}) {
  const { class: classParam, week: weekParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, periods_per_day, academic_years(year)")
    .eq("id", classParam ?? "")
    .maybeSingle();
  if (!classroom) redirect("/work/lessons");

  const week =
    weekParam && DATE_RE.test(weekParam)
      ? weekStartString(weekParam)
      : weekStartString(todayString());
  const friday = addDaysString(week, 4);
  const days = Array.from({ length: 5 }, (_, i) => ({
    date: addDaysString(week, i),
    label: DAY_NAMES[i],
  }));

  const periodCount = classroom.periods_per_day ?? 6;
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  const [{ data: slots }, { data: subjects }, { data: plans }, { data: events }] =
    await Promise.all([
      supabase
        .from("timetable_slots")
        .select("day_of_week, period, subject")
        .eq("classroom_id", classroom.id),
      supabase.from("subjects").select("id, name").eq("classroom_id", classroom.id),
      supabase
        .from("lesson_plans")
        .select("plan_date, period, subject_id, unit")
        .eq("classroom_id", classroom.id)
        .gte("plan_date", week)
        .lte("plan_date", friday),
      supabase
        .from("events")
        .select("title, layer, event_date, end_date")
        .eq("classroom_id", classroom.id)
        .lte("event_date", friday)
        .or(`end_date.gte.${week},event_date.gte.${week}`)
        .order("event_date"),
    ]);

  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const timetable = new Map(
    (slots ?? []).map((s) => [`${s.day_of_week}-${s.period}`, s.subject]),
  );
  const planByCell = new Map(
    (plans ?? []).map((p) => [`${p.plan_date}-${p.period}`, p]),
  );

  // 이번 주에 걸치는 일정만 (기간 일정 포함)
  const weekDates = new Set(dateRange(week, friday));
  const weekEvents = (events ?? []).filter((e) => {
    for (const d of dateRange(
      e.event_date < week ? week : e.event_date,
      (e.end_date ?? e.event_date) > friday ? friday : (e.end_date ?? e.event_date),
    )) {
      if (weekDates.has(d)) return true;
    }
    return false;
  });

  const year = classroom.academic_years?.year;
  const backHref = `/work/lessons?class=${classroom.id}&week=${week}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6 print:p-0">
      {/* 화면 전용 상단 바 (인쇄 시 숨김) */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={backHref}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
        >
          ← 수업 그리드
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/work/lessons/weekly-guide?class=${classroom.id}&week=${addDaysString(week, -7)}`}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            ← 지난주
          </Link>
          <Link
            href={`/work/lessons/weekly-guide?class=${classroom.id}&week=${addDaysString(week, 7)}`}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            다음주 →
          </Link>
          <PrintButton />
        </div>
      </div>
      <p className="-mt-2 text-xs text-ink-faint print:hidden">
        인쇄 대화상자에서 &ldquo;PDF로 저장&rdquo;을 고르면 파일로도 보낼 수 있어요.
      </p>

      {/* 인쇄 문서 */}
      <article className="rounded-2xl border border-line-strong bg-paper p-6 print:rounded-none print:border-0 print:p-0">
        <header className="mb-4 border-b-2 border-ink pb-3 text-center">
          <h1 className="text-2xl font-bold text-ink">
            {classroom.name} 주간학습안내
          </h1>
          <p className="mt-1 text-sm text-ink-soft tabular-nums">
            {year ? `${year}학년도 · ` : ""}
            {formatMonthDay(week)} ~ {formatMonthDay(friday)}
          </p>
        </header>

        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border border-line-strong bg-paper-soft p-1.5 text-xs text-ink-soft">
                교시
              </th>
              {days.map((d) => (
                <th
                  key={d.date}
                  className="border border-line-strong bg-paper-soft p-1.5 text-ink"
                >
                  <span className="font-bold">{d.label}</span>
                  <span className="ml-1 text-xs font-normal text-ink-faint tabular-nums">
                    {formatMonthDay(d.date)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period, di) => (
              <tr key={period}>
                <th className="border border-line-strong bg-paper-soft p-1.5 text-center font-bold tabular-nums text-ink-soft">
                  {period}
                </th>
                {days.map((d, dayIdx) => {
                  const plan = planByCell.get(`${d.date}-${period}`);
                  const subject =
                    (plan?.subject_id ? subjectName.get(plan.subject_id) : null) ??
                    timetable.get(`${dayIdx + 1}-${period}`) ??
                    null;
                  return (
                    <td
                      key={d.date}
                      className="h-14 border border-line-strong p-1.5 align-top"
                    >
                      {subject && (
                        <span className="block text-xs font-semibold text-ink">
                          {subject}
                        </span>
                      )}
                      {plan?.unit && (
                        <span className="block break-words text-[11px] leading-tight text-ink-soft">
                          {plan.unit}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {weekEvents.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 border-b border-line-strong pb-1 text-sm font-bold text-ink">
              이번 주 일정
            </h2>
            <ul className="flex flex-col gap-1 text-sm text-ink">
              {weekEvents.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 font-medium tabular-nums text-ink-soft">
                    {formatMonthDay(e.event_date)}
                    {e.end_date && e.end_date !== e.event_date
                      ? `~${formatMonthDay(e.end_date)}`
                      : ""}
                  </span>
                  <span>{e.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <h2 className="mb-2 border-b border-line-strong pb-1 text-sm font-bold text-ink">
            가정에서 알려주세요
          </h2>
          <EditableNote />
        </section>

        <p className="mt-4 text-center text-xs text-ink-faint">
          {classroom.name} · 학교수첩에서 자동 생성
        </p>
      </article>
    </main>
  );
}
