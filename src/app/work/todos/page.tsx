import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import { DAY_NAMES, dayOfWeekMon1, formatKoreanDate, todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { addTodo, deleteTodo, toggleTodo } from "../actions";

const PRIORITY_BADGE = ["", "🔴", "🟡", "🟢"] as const;

export default async function WorkTodosPage({
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

  const today = todayString();
  const todayDow = dayOfWeekMon1();

  const { data: todos } = await supabase
    .from("work_todos")
    .select("id, title, due_date, priority, repeat_dow, done_at, last_done_date")
    .order("priority")
    .order("due_date", { nullsFirst: false });

  const isDone = (t: NonNullable<typeof todos>[number]) =>
    t.repeat_dow ? t.last_done_date === today : t.done_at !== null;

  const active = (todos ?? []).filter((t) => t.repeat_dow || !t.done_at);
  const finished = (todos ?? []).filter((t) => !t.repeat_dow && t.done_at);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="todos" />

      <h1 className="text-2xl font-display text-ink">✅ 할 일</h1>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">새 할 일</h2>
        <form action={addTodo} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm text-ink-soft">
            할 일
            <input
              type="text"
              name="title"
              required
              placeholder="주간학습안내 올리기"
              className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            마감일 <span className="text-xs text-ink-faint">(선택)</span>
            <input type="date" name="due_date" className="rounded-lg border border-line bg-paper-soft p-2 text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            우선순위
            <select name="priority" defaultValue="2" className="rounded-lg border border-line bg-paper-soft p-2 text-ink">
              <option value="1">🔴 높음</option>
              <option value="2">🟡 보통</option>
              <option value="3">🟢 낮음</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            매주 반복 <span className="text-xs text-ink-faint">(선택)</span>
            <select name="repeat_dow" defaultValue="0" className="rounded-lg border border-line bg-paper-soft p-2 text-ink">
              <option value="0">반복 없음</option>
              {DAY_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  매주 {name}요일
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            추가
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-ink-faint">
          진행 중 · 반복
        </h2>
        {active.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {active.map((t) => {
              const done = isDone(t);
              const overdue = !t.repeat_dow && t.due_date && t.due_date < today;
              return (
                <li
                  key={t.id}
                  className={`flex items-center gap-2 rounded-xl border bg-paper p-3 text-sm ${
                    overdue && !done ? "border-red-200" : "border-line"
                  }`}
                >
                  <form action={toggleTodo} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="todo_id" value={t.id} />
                    <input type="hidden" name="back" value="/work/todos" />
                    <button
                      type="submit"
                      className="flex flex-1 items-center gap-2.5 text-left"
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
                      <span className={done ? "text-ink-faint line-through" : "font-medium text-ink"}>
                        {PRIORITY_BADGE[t.priority]} {t.title}
                      </span>
                      {t.repeat_dow ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          매주 {DAY_NAMES[t.repeat_dow - 1]} {done && "· 오늘 완료"}
                        </span>
                      ) : (
                        t.due_date && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              overdue
                                ? "bg-red-100 font-bold text-red-600"
                                : "bg-paper-soft text-ink-soft"
                            }`}
                          >
                            {formatKoreanDate(t.due_date)}
                          </span>
                        )
                      )}
                    </button>
                  </form>
                  <form action={deleteTodo}>
                    <input type="hidden" name="todo_id" value={t.id} />
                    <button
                      type="submit"
                      title="삭제"
                      className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      ×
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-6 text-center text-sm text-ink-soft">
            ☕ 등록된 할 일이 없어요.
          </p>
        )}
      </section>

      {finished.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold tracking-wide text-ink-faint">
            완료됨 {finished.length}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {finished.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-line bg-paper-soft p-3 text-sm text-ink-faint"
              >
                <form action={toggleTodo} className="flex flex-1 items-center gap-2.5">
                  <input type="hidden" name="todo_id" value={t.id} />
                  <input type="hidden" name="back" value="/work/todos" />
                  <button type="submit" className="flex flex-1 items-center gap-2.5 text-left">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-400 bg-slate-400 text-xs font-bold text-white">
                      ✓
                    </span>
                    <span className="line-through">{t.title}</span>
                  </button>
                </form>
                <form action={deleteTodo}>
                  <input type="hidden" name="todo_id" value={t.id} />
                  <button
                    type="submit"
                    title="삭제"
                    className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
