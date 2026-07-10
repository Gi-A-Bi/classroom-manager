import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import {
  DAY_NAMES,
  dayOfWeekMon1,
  daysBetween,
  formatKoreanDate,
  todayString,
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="" />

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight tabular-nums">
          💼 {Number(today.slice(5, 7))}월 {Number(today.slice(8))}일{" "}
          <span className="text-xl font-bold text-gray-400">
            {DAY_NAMES[todayDow - 1]}요일
          </span>
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">✅ 오늘 할 일</h2>
            <Link href="/work/todos" className="text-sm text-slate-500 underline">
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
                        className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition-colors ${
                          done ? "bg-slate-50 text-gray-400" : "hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-colors ${
                            done
                              ? "border-slate-500 bg-slate-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {done ? "✓" : ""}
                        </span>
                        <span className={done ? "line-through" : "font-medium"}>
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
            <p className="rounded-xl border-2 border-dashed p-5 text-center text-sm text-gray-400">
              ☕ 오늘 할 일이 없어요.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">📄 기한 임박 공문</h2>
            <Link
              href="/work/documents"
              className="text-sm text-slate-500 underline"
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
                      dday < 0 ? "border-red-200 bg-red-50" : ""
                    }`}
                  >
                    <span className="font-medium">{d.title}</span>
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
            <p className="rounded-xl border-2 border-dashed p-5 text-center text-sm text-gray-400">
              📭 3일 안에 처리할 공문이 없어요.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">🗓️ 오늘 업무 일정</h2>
            <Link
              href="/work/calendar"
              className="text-sm text-slate-500 underline"
            >
              캘린더
            </Link>
          </div>
          {events && events.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-sm"
                >
                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {e.category}
                  </span>
                  <span className="font-medium">{e.title}</span>
                  {e.end_date && (
                    <span className="ml-auto text-xs text-gray-400">
                      ~{formatKoreanDate(e.end_date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border-2 border-dashed p-5 text-center text-sm text-gray-400">
              🍃 오늘은 업무 일정이 없어요.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">🔗 자주 쓰는 링크</h2>
            <Link href="/work/links" className="text-sm text-slate-500 underline">
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
            <p className="rounded-xl border-2 border-dashed p-5 text-center text-sm text-gray-400">
              🔖 나이스, 업무포털 같은 링크를 등록해보세요.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
