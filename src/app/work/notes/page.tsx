import Link from "next/link";
import { redirect } from "next/navigation";
import { TagInput } from "@/components/TagInput";
import { WorkNav } from "@/components/WorkNav";
import { formatKoreanDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { deleteNote, saveNote } from "../actions";

export default async function WorkNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; tag?: string; edit?: string }>;
}) {
  const { error, q, tag, edit } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("work_notes")
    .select("id, title, content, tags, updated_at")
    .order("updated_at", { ascending: false });
  if (q?.trim()) {
    const term = q.trim().replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
  }
  if (tag?.trim()) {
    query = query.contains("tags", [tag.trim()]);
  }
  const { data: notes } = await query;

  // 태그 자동완성용 전체 태그 목록 (필터와 무관하게)
  const { data: allNotes } = await supabase.from("work_notes").select("tags");
  const allTags = [...new Set((allNotes ?? []).flatMap((n) => n.tags))].sort();

  const editing = edit ? (notes ?? []).find((n) => n.id === edit) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="notes" />

      <h1 className="text-2xl font-display text-ink">📒 업무 노트</h1>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">
          {editing ? `"${editing.title}" 수정` : "새 노트"}
          {editing && (
            <Link href="/work/notes" className="ml-2 text-sm font-normal text-ink-faint underline">
              취소
            </Link>
          )}
        </h2>
        <form action={saveNote} className="flex flex-col gap-3">
          {editing && <input type="hidden" name="note_id" value={editing.id} />}
          <input
            type="text"
            name="title"
            required
            defaultValue={editing?.title ?? ""}
            placeholder="제목"
            className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
          />
          <textarea
            name="content"
            rows={5}
            defaultValue={editing?.content ?? ""}
            placeholder="내용"
            className="rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink placeholder:text-ink-faint"
          />
          <TagInput
            existingTags={allTags}
            defaultValue={editing ? editing.tags.map((t) => `#${t}`).join(" ") : ""}
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            {editing ? "수정 저장" : "저장"}
          </button>
        </form>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <form method="get" className="flex flex-1 gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="제목·본문 검색"
            className="min-w-40 flex-1 rounded-xl border border-line bg-paper p-2.5 text-sm text-ink placeholder:text-ink-faint"
          />
          <button
            type="submit"
            className="rounded-xl border border-line bg-paper px-4 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            🔍
          </button>
        </form>
        {allTags.map((t) => (
          <Link
            key={t}
            href={tag === t ? "/work/notes" : `/work/notes?tag=${encodeURIComponent(t)}`}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              tag === t
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            #{t}
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-ink-faint">
          {tag ? `#${tag} · ` : ""}
          {q ? `"${q}" 검색 · ` : ""}
          {notes?.length ?? 0}개 (최근 수정순)
        </h2>
        {notes && notes.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li key={n.id} className="flex flex-col gap-2 rounded-xl border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{n.title}</h3>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                    {formatKoreanDate(n.updated_at.slice(0, 10))}
                    <Link
                      href={`/work/notes?edit=${n.id}`}
                      className="ml-2 rounded-md border border-line px-2 py-1 text-ink-soft transition-colors hover:bg-paper-soft"
                    >
                      수정
                    </Link>
                    <form action={deleteNote}>
                      <input type="hidden" name="note_id" value={n.id} />
                      <button
                        type="submit"
                        title="삭제"
                        className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        ×
                      </button>
                    </form>
                  </span>
                </div>
                {n.content && (
                  <p className="text-sm whitespace-pre-wrap text-ink">{n.content}</p>
                )}
                {n.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {n.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/work/notes?tag=${encodeURIComponent(t)}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition-colors hover:bg-slate-200"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center text-sm text-ink-soft">
            {q || tag ? "🔍 조건에 맞는 노트가 없어요." : "📒 첫 노트를 남겨보세요."}
          </p>
        )}
      </section>
    </main>
  );
}
