import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import {
  DAY_NAMES,
  dayOfWeekMon1,
  daysBetween,
  formatKoreanDate,
  todayString,
  weekStartString,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { toggleTodo } from "./actions";

const PRIORITY_BADGE = ["", "🔴", "🟡", "🟢"] as const;

export default async function WorkDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayString();
  const todayDow = dayOfWeekMon1();

  const [{ data: todos }, { data: docs }, { data: events }, { data: links }] =
    await Promise.all([
      supabase
        .from("work_todos")
        .select("id, title, due_date, priority, repeat_dow, done_at, last_done_date")
        .order("priority")
        .order("due_date"),
      supabase
        .from("work_documents")
        .select("id, title, due_date, status")
        .neq("status", "done")
        .not("due_date", "is", null)
        .order("due_date"),
      supabase
        .from("work_events")
        .select("id, title, category, event_date, end_date")
        .lte("event_date", today)
        .or(`end_date.gte.${today},event_date.eq.${today}`),
      supabase.from("work_links").select("id, name, url").order("position"),
    ]);

  // 오늘 할 일: 마감이 오늘이거나 지난 단발성 + 오늘 요일의 반복
  const todayTodos = (todos ?? []).filter((t) =>
    t.repeat_dow
      ? t.repeat_dow === todayDow
      : !t.done_at && t.due_date !== null && t.due_date <= today,
  );
  const isDone = (t: (typeof todayTodos)[number]) =>
    t.repeat_dow ? t.last_done_date === today : t.done_at !== null;

  // 기한 임박 공문: 3일 이내 또는 이미 지난 미완료 건
  const urgentDocs = (docs ?? []).filter(
    (d) => d.due_date && daysBetween(today, d.due_date) <= 3,
  );

  // 오늘 수업: 시간표(오늘 요일) 배경 + 오늘 저장된 계획을 학급별로 합친다
  const [{ data: classes }, { data: todaySlots }, { data: todayPlans }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name")
        .order("created_at", { ascending: false }),
      todayDow <= 5
        ? supabase
            .from("timetable_slots")
            .select("classroom_id, period, subject")
            .eq("day_of_week", todayDow)
        : Promise.resolve({ data: [] as { classroom_id: string; period: number; subject: string }[] }),
      supabase
        .from("lesson_plans")
        .select("classroom_id, period, unit, done")
        .eq("plan_date", today),
    ]);

  type LessonRow = { period: number; subject: string | null; unit: string; done: boolean; hasPlan: boolean };
  const byClass = new Map<string, Map<number, LessonRow>>();
  const rowMap = (cid: string) => {
    let m = byClass.get(cid);
    if (!m) {
      m = new Map<number, LessonRow>();
      byClass.set(cid, m);
    }
    return m;
  };
  for (const s of todaySlots ?? []) {
    rowMap(s.classroom_id).set(s.period, {
      period: s.period,
      subject: s.subject,
      unit: "",
      done: false,
      hasPlan: false,
    });
  }
  for (const p of todayPlans ?? []) {
    const m = rowMap(p.classroom_id);
    const existing = m.get(p.period);
    m.set(p.period, {
      period: p.period,
      subject: existing?.subject ?? null,
      unit: p.unit,
      done: p.done,
      hasPlan: true,
    });
  }
  const todayLessons = (classes ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      rows: [...(byClass.get(c.id)?.values() ?? [])].sort((a, b) => a.period - b.period),
    }))
    .filter((c) => c.rows.length > 0);
  const weekMon = weekStartString(today);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="" />

      <header>
        <h1 className="text-3xl font-display tabular-nums text-ink">
          💼 {Number(today.slice(5, 7))}월 {Number(today.slice(8))}일{" "}
          <span className="text-xl font-bold text-ink-faint">
            {DAY_NAMES[todayDow - 1]}요일
          </span>
        </h1>
      </header>

      {todayLessons.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">오늘 수업</h2>
            <Link href={`/work/lessons?week=${weekMon}`} className="text-sm text-slate-600 underline">
              수업 그리드
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {todayLessons.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5">
                {todayLessons.length > 1 && (
                  <p className="text-xs font-bold tracking-wide text-ink-faint">{c.name}</p>
                )}
                <ul className="flex flex-wrap gap-1.5">
                  {c.rows.map((r) => (
                    <li key={r.period}>
                      <Link
                        href={`/work/lessons?class=${c.id}&week=${weekMon}`}
                        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-sm transition-colors ${
                          r.done
                            ? "border-slate-200 bg-slate-50 text-ink-soft"
                            : "border-line bg-paper hover:bg-paper-soft"
                        }`}
                      >
                        <span className="tabular-nums text-xs font-bold text-ink-faint">
                          {r.period}
                        </span>
                        <span className="font-medium text-ink">{r.subject ?? "수업"}</span>
                        {r.unit && <span className="text-xs text-ink-soft">· {r.unit}</span>}
                        {r.done && <span className="text-xs text-slate-500">✓</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">오늘 할 일</h2>
            <Link href="/work/todos" className="text-sm text-slate-600 underline">
              전체 보기
            </Link>
          </div>
          {todayTodos.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {todayTodos.map((t) => {
                const done = isDone(t);
                const overdue = !t.repeat_dow && t.due_date! < today && !done;
                return (
                  <li key={t.id}>
                    <form action={toggleTodo}>
                      <input type="hidden" name="todo_id" value={t.id} />
                      <input type="hidden" name="back" value="/work" />
                      <button
                        type="submit"
                        className={`flex w-full items-center gap-2 rounded-xl border border-line p-2.5 text-left text-sm transition-colors ${
                          done ? "bg-paper-soft text-ink-faint" : "hover:bg-paper-soft"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-colors ${
                            done
                              ? "border-slate-500 bg-slate-500 text-white"
                              : "border-line-strong"
                          }`}
                        >
                          {done ? "✓" : ""}
                        </span>
                        <span className={done ? "line-through" : "font-medium text-ink"}>
                          {PRIORITY_BADGE[t.priority]} {t.title}
                        </span>
                        {t.repeat_dow && (
                          <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            매주 {DAY_NAMES[t.repeat_dow - 1]}
                          </span>
                        )}
                        {overdue && (
                          <span className="ml-auto shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                            지남
                          </span>
                        )}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-5 text-center text-sm text-ink-soft">
              ☕ 오늘 할 일이 없어요.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">기한 임박 공문</h2>
            <Link
              href="/work/documents"
              className="text-sm text-slate-600 underline"
            >
              전체 보기
            </Link>
          </div>
          {urgentDocs.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {urgentDocs.map((d) => {
                const dday = daysBetween(today, d.due_date!);
                return (
                  <li
                    key={d.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-sm ${
                      dday < 0 ? "border-red-200 bg-red-50" : "border-line"
                    }`}
                  >
                    <span className="font-medium text-ink">{d.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                        dday < 0
                          ? "bg-red-500 text-white"
                          : dday === 0
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {dday < 0 ? `${-dday}일 지남` : dday === 0 ? "오늘" : `D-${dday}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-5 text-center text-sm text-ink-soft">
              📭 3일 안에 처리할 공문이 없어요.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">오늘 업무 일정</h2>
            <Link
              href="/work/calendar"
              className="text-sm text-slate-600 underline"
            >
              캘린더
            </Link>
          </div>
          {events && events.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 rounded-xl bg-paper-soft p-2.5 text-sm"
                >
                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {e.category}
                  </span>
                  <span className="font-medium text-ink">{e.title}</span>
                  {e.end_date && (
                    <span className="ml-auto text-xs text-ink-faint">
                      ~{formatKoreanDate(e.end_date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-5 text-center text-sm text-ink-soft">
              🍃 오늘은 업무 일정이 없어요.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">자주 쓰는 링크</h2>
            <Link href="/work/links" className="text-sm text-slate-600 underline">
              관리
            </Link>
          </div>
          {links && links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  {l.name} ↗
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-5 text-center text-sm text-ink-soft">
              🔖 나이스, 업무포털 같은 링크를 등록해보세요.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
