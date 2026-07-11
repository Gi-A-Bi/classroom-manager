import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-auth";
import { createStudentClient } from "@/lib/supabase/student";
import { toggleItemCheck } from "./actions";

function formatDate(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function StudentPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getStudentSession();
  if (!session) redirect("/student/login");

  const supabase = createStudentClient(session.token);

  // 다른 학급의 알림장은 RLS 때문에 조회 자체가 안 된다 → 404
  const { data: post } = await supabase
    .from("posts")
    .select("id, title, content, post_date")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  // 읽음 기록 (이미 있으면 무시) — 알림장을 열었다는 사실 자체가 읽음
  await supabase.from("post_reads").upsert(
    {
      post_id: post.id,
      student_id: session.studentId,
      classroom_id: session.classroomId,
    },
    { onConflict: "post_id,student_id", ignoreDuplicates: true },
  );

  const [{ data: items }, { data: myChecks }] = await Promise.all([
    supabase
      .from("post_items")
      .select("id, label")
      .eq("post_id", post.id)
      .order("position"),
    supabase
      .from("item_checks")
      .select("item_id")
      .eq("student_id", session.studentId),
  ]);

  const checkedSet = new Set((myChecks ?? []).map((c) => c.item_id));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 p-5">
      <nav>
        <Link href="/student" className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
          ← 알림장 목록
        </Link>
      </nav>

      <article className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">{formatDate(post.post_date)}</p>
        <h1 className="text-2xl font-display text-ink">{post.title}</h1>
        <div className="rounded-2xl border border-line bg-paper p-4 leading-relaxed whitespace-pre-wrap text-ink">
          {post.content}
        </div>
      </article>

      {items && items.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-ink">🎒 준비물 체크</h2>
          <p className="text-sm text-ink-soft">
            준비한 것을 눌러서 체크해요. 다시 누르면 해제돼요.
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const checked = checkedSet.has(item.id);
              return (
                <li key={item.id}>
                  <form action={toggleItemCheck}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <input type="hidden" name="post_id" value={post.id} />
                    <button
                      type="submit"
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left text-base transition-all duration-200 ${
                        checked
                          ? "border-green-500 bg-green-50"
                          : "border-line bg-paper hover:border-line-strong active:bg-paper-soft"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold transition-colors duration-200 ${
                          checked
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-line-strong"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <span className={checked ? "font-medium text-ink" : "text-ink"}>
                        {item.label}
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
