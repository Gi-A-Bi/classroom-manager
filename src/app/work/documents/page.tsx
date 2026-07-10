import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import { daysBetween, formatKoreanDate, todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { addDocument, deleteDocument, setDocumentStatus } from "../actions";

const STATUS = [
  ["received", "접수", "bg-gray-100 text-gray-600"],
  ["in_progress", "처리중", "bg-blue-100 text-blue-700"],
  ["done", "완료", "bg-green-100 text-green-700"],
] as const;

export default async function WorkDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { error, q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayString();

  let query = supabase
    .from("work_documents")
    .select("id, title, received_date, due_date, status, memo, link");
  if (q?.trim()) {
    query = query.ilike("title", `%${q.trim()}%`);
  }
  const { data: docs } = await query;

  // 미완료(기한 임박순, 기한 없음 뒤) → 완료(최근 접수순)
  const sorted = [...(docs ?? [])].sort((a, b) => {
    if ((a.status === "done") !== (b.status === "done")) {
      return a.status === "done" ? 1 : -1;
    }
    if (a.status === "done") return b.received_date.localeCompare(a.received_date);
    if (!a.due_date && !b.due_date) return a.received_date.localeCompare(b.received_date);
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="documents" />

      <h1 className="text-2xl font-extrabold tracking-tight">📄 공문 트래커</h1>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">공문 등록</h2>
        <form action={addDocument} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
              제목
              <input
                type="text"
                name="title"
                required
                placeholder="2026 정보공시 자료 제출"
                className="rounded-lg border p-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              접수일
              <input
                type="date"
                name="received_date"
                required
                defaultValue={today}
                className="rounded-lg border p-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              처리기한 <span className="text-xs text-gray-400">(선택)</span>
              <input type="date" name="due_date" className="rounded-lg border p-2" />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
              메모 <span className="text-xs text-gray-400">(선택)</span>
              <input
                type="text"
                name="memo"
                placeholder="담당 부장 확인 후 기안"
                className="rounded-lg border p-2"
              />
            </label>
            <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
              관련 링크 <span className="text-xs text-gray-400">(선택)</span>
              <input
                type="url"
                name="link"
                placeholder="https://..."
                className="rounded-lg border p-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              등록
            </button>
          </div>
        </form>
      </section>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="제목 검색"
          className="flex-1 rounded-xl border bg-white p-2.5 text-sm shadow-sm"
        />
        <button
          type="submit"
          className="rounded-xl border bg-white px-4 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        >
          🔍 검색
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-gray-400">
          {q ? `"${q}" 검색 결과 ${sorted.length}건` : `전체 ${sorted.length}건`}
        </h2>
        {sorted.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sorted.map((d) => {
              const overdue =
                d.status !== "done" && d.due_date && d.due_date < today;
              const dday = d.due_date ? daysBetween(today, d.due_date) : null;
              return (
                <li
                  key={d.id}
                  className={`flex flex-col gap-2 rounded-xl border bg-white p-4 shadow-sm ${
                    overdue ? "border-red-300 bg-red-50" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {d.title}
                      {d.link && (
                        <a
                          href={d.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm font-normal text-blue-600 underline"
                        >
                          링크 ↗
                        </a>
                      )}
                    </span>
                    <form action={deleteDocument}>
                      <input type="hidden" name="doc_id" value={d.id} />
                      <button
                        type="submit"
                        title="삭제"
                        className="rounded-md px-2 py-1 text-gray-300 transition-colors hover:bg-red-100 hover:text-red-500"
                      >
                        ×
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>접수 {formatKoreanDate(d.received_date)}</span>
                    {d.due_date && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium tabular-nums ${
                          overdue
                            ? "bg-red-500 text-white"
                            : d.status !== "done" && dday !== null && dday <= 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        기한 {formatKoreanDate(d.due_date)}
                        {d.status !== "done" &&
                          dday !== null &&
                          (dday < 0 ? ` · ${-dday}일 지남` : dday === 0 ? " · 오늘" : ` · D-${dday}`)}
                      </span>
                    )}
                    {d.memo && <span>💬 {d.memo}</span>}
                  </div>

                  <div className="flex gap-1.5">
                    {STATUS.map(([key, label, style]) => (
                      <form key={key} action={setDocumentStatus}>
                        <input type="hidden" name="doc_id" value={d.id} />
                        <input type="hidden" name="status" value={key} />
                        <input
                          type="hidden"
                          name="back"
                          value={`/work/documents${q ? `?q=${encodeURIComponent(q)}` : ""}`}
                        />
                        <button
                          type="submit"
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                            d.status === key
                              ? `${style} shadow-sm ring-1 ring-gray-300`
                              : "bg-white text-gray-400 hover:bg-gray-50 border"
                          }`}
                        >
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-gray-400">
            {q ? "🔍 검색 결과가 없어요." : "📭 등록된 공문이 없어요."}
          </p>
        )}
      </section>
    </main>
  );
}
