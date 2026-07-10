import { redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { WorkNav } from "@/components/WorkNav";
import { createClient } from "@/lib/supabase/server";
import { addSnippet, deleteSnippet } from "../actions";

export default async function WorkSnippetsPage({
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

  let query = supabase
    .from("work_snippets")
    .select("id, title, content")
    .order("created_at", { ascending: false });
  if (q?.trim()) {
    const term = q.trim().replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
  }
  const { data: snippets } = await query;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="snippets" />

      <h1 className="text-2xl font-display text-ink">📑 문서 스니펫</h1>
      <p className="-mt-3 text-sm text-ink-soft">
        가정통신문 상용구, 학기초 안내문처럼 자주 쓰는 문구를 저장해두고 복사
        버튼 한 번으로 붙여넣으세요.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">새 스니펫</h2>
        <form action={addSnippet} className="flex flex-col gap-3">
          <input
            type="text"
            name="title"
            required
            placeholder="가정통신문 인사말"
            className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
          />
          <textarea
            name="content"
            required
            rows={4}
            placeholder={"학부모님, 안녕하십니까?\n항상 본교 교육활동에 관심을 가져주셔서 감사합니다."}
            className="rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink placeholder:text-ink-faint"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            저장
          </button>
        </form>
      </section>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="검색"
          className="flex-1 rounded-xl border border-line bg-paper p-2.5 text-sm text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          className="rounded-xl border border-line bg-paper px-4 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
        >
          🔍
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-ink-faint">
          {q ? `"${q}" 검색 결과 ` : ""}
          {snippets?.length ?? 0}개
        </h2>
        {snippets && snippets.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {snippets.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-line bg-paper p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h3 className="font-semibold text-ink">{s.title}</h3>
                    <form action={deleteSnippet}>
                      <input type="hidden" name="snippet_id" value={s.id} />
                      <button
                        type="submit"
                        title="삭제"
                        className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-ink-soft">
                    {s.content}
                  </p>
                </div>
                <CopyButton text={s.content} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center text-sm text-ink-soft">
            {q ? "🔍 검색 결과가 없어요." : "📑 첫 스니펫을 저장해보세요."}
          </p>
        )}
      </section>
    </main>
  );
}
