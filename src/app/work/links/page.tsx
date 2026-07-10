import { redirect } from "next/navigation";
import { WorkNav } from "@/components/WorkNav";
import { createClient } from "@/lib/supabase/server";
import { addLink, deleteLink } from "../actions";

export default async function WorkLinksPage({
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

  const { data: links } = await supabase
    .from("work_links")
    .select("id, name, url")
    .order("position");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <WorkNav current="links" />

      <h1 className="text-2xl font-extrabold tracking-tight">🔗 자주 쓰는 링크</h1>
      <p className="-mt-3 text-sm text-gray-500">
        나이스, 업무포털, 학교 홈페이지처럼 매일 여는 주소를 등록하면 업무
        대시보드에 바로가기 버튼이 생겨요.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">링크 추가</h2>
        <form action={addLink} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            이름
            <input
              type="text"
              name="name"
              required
              placeholder="나이스"
              className="rounded-lg border p-2"
            />
          </label>
          <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
            주소
            <input
              type="url"
              name="url"
              required
              placeholder="https://..."
              className="rounded-lg border p-2"
            />
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
        <h2 className="text-xs font-bold tracking-wide text-gray-400">
          등록된 링크 {links?.length ?? 0}
        </h2>
        {links && links.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {links.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3 text-sm shadow-sm"
              >
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 font-medium text-slate-700 hover:underline"
                >
                  {l.name} ↗
                  <span className="truncate text-xs font-normal text-gray-400">
                    {l.url}
                  </span>
                </a>
                <form action={deleteLink}>
                  <input type="hidden" name="link_id" value={l.id} />
                  <button
                    type="submit"
                    title="삭제"
                    className="rounded-md px-2 py-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-gray-400">
            🔖 아직 등록된 링크가 없어요.
          </p>
        )}
      </section>
    </main>
  );
}
