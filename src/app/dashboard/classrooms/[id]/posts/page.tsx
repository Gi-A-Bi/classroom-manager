import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKstDateTime, isoToKstLocalInput, todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";
import { deletePost, deleteTemplate } from "./actions";
import { PostComposer, type Template } from "./PostComposer";

function formatDate(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function ClassroomPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { error, success, edit } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: posts }, { data: students }, { data: templates }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name, class_code, theme_color")
        .eq("id", id)
        .single(),
      supabase
        .from("posts")
        .select("id, title, content, post_date, publish_at")
        .eq("classroom_id", id)
        .order("post_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("students")
        .select("id, number, nickname")
        .eq("classroom_id", id)
        .order("number"),
      supabase
        .from("post_templates")
        .select("id, title, content, items")
        .order("created_at", { ascending: false }),
    ]);

  if (!classroom) notFound();

  const postIds = (posts ?? []).map((p) => p.id);
  const [{ data: reads }, { data: items }] =
    postIds.length > 0
      ? await Promise.all([
          supabase.from("post_reads").select("post_id, student_id").in("post_id", postIds),
          supabase
            .from("post_items")
            .select("id, post_id, label, position")
            .in("post_id", postIds)
            .order("position"),
        ])
      : [{ data: [] }, { data: [] }];

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: checks } =
    itemIds.length > 0
      ? await supabase.from("item_checks").select("item_id, student_id").in("item_id", itemIds)
      : { data: [] };

  const readSet = new Set((reads ?? []).map((r) => `${r.post_id}:${r.student_id}`));
  const checkCount = new Map<string, number>();
  for (const c of checks ?? []) {
    checkCount.set(c.item_id, (checkCount.get(c.item_id) ?? 0) + 1);
  }

  const totalStudents = students?.length ?? 0;
  const theme = getTheme(classroom.theme_color);
  const now = Date.now();

  const allPosts = posts ?? [];
  const scheduled = allPosts
    .filter((p) => new Date(p.publish_at).getTime() > now)
    .sort((a, b) => new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime());
  const published = allPosts.filter((p) => new Date(p.publish_at).getTime() <= now);

  const itemsOf = (postId: string) =>
    (items ?? []).filter((i) => i.post_id === postId);

  // 수정 대상 로드 (예약 알림장 편집)
  const editPost = edit ? allPosts.find((p) => p.id === edit) : null;
  const editInitial = editPost
    ? {
        postId: editPost.id,
        title: editPost.title,
        content: editPost.content,
        items: itemsOf(editPost.id).map((i) => i.label).join("\n"),
        postDate: editPost.post_date,
        publishMode: (new Date(editPost.publish_at).getTime() > now ? "schedule" : "now") as
          | "now"
          | "schedule",
        publishLocal: isoToKstLocalInput(editPost.publish_at),
      }
    : undefined;

  const templateList: Template[] = (templates ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    content: t.content,
    items: t.items ?? [],
  }));

  const renderReads = (postId: string) =>
    totalStudents > 0 ? (
      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <span className="text-sm font-medium text-ink">
          읽음{" "}
          <strong
            className={`tabular-nums ${
              students!.filter((s) => readSet.has(`${postId}:${s.id}`)).length === totalStudents
                ? "text-green-600"
                : theme.text
            }`}
          >
            {students!.filter((s) => readSet.has(`${postId}:${s.id}`)).length}
          </strong>
          <span className="text-ink-faint">/{totalStudents}</span>
        </span>
        <div className="flex flex-wrap gap-1">
          {students!.map((s) => {
            const hasRead = readSet.has(`${postId}:${s.id}`);
            return (
              <span
                key={s.id}
                title={`${s.number}번 ${s.nickname} — ${hasRead ? "읽음" : "안 읽음"}`}
                className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs ${
                  hasRead ? "bg-green-500 font-bold text-white" : "bg-paper-soft text-ink-faint"
                }`}
              >
                {s.number}
              </span>
            );
          })}
        </div>
      </div>
    ) : null;

  const renderItems = (postId: string) => {
    const postItems = itemsOf(postId);
    if (postItems.length === 0) return null;
    return (
      <div className="flex flex-col gap-1 border-t border-line pt-3">
        <span className="text-sm font-medium text-ink">준비물</span>
        <ul className="flex flex-col gap-1 text-sm text-ink">
          {postItems.map((item) => {
            const count = checkCount.get(item.id) ?? 0;
            return (
              <li key={item.id} className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                    count === totalStudents && totalStudents > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-paper-soft text-ink-soft"
                  }`}
                >
                  {count}/{totalStudents}
                </span>
                {item.label}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="posts" themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="알림장"
        classCode={classroom.class_code}
        themeColor={classroom.theme_color}
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <PostComposer
        key={editInitial ? `edit-${editInitial.postId}` : "new"}
        classroomId={classroom.id}
        templates={templateList}
        today={todayString()}
        initial={editInitial}
      />

      {/* 저장된 템플릿 */}
      {templateList.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-faint">
            내 템플릿 {templateList.length}개
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {templateList.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-3 pr-1.5 text-sm text-ink"
              >
                {t.title}
                <form action={deleteTemplate}>
                  <input type="hidden" name="classroom_id" value={classroom.id} />
                  <input type="hidden" name="template_id" value={t.id} />
                  <button
                    type="submit"
                    title="템플릿 삭제"
                    className="rounded-md px-1.5 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 예약된 알림장 */}
      {scheduled.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-ink">예약된 알림장 {scheduled.length}개</h2>
          <ul className="flex flex-col gap-2">
            {scheduled.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    예약됨
                  </span>
                  <h3 className="font-semibold text-ink">{p.title}</h3>
                  <span className="text-xs text-ink-faint tabular-nums">
                    {formatDate(p.post_date)}
                  </span>
                </div>
                <p className="text-sm text-amber-800">
                  {formatKstDateTime(p.publish_at)}에 공개
                </p>
                <p className="line-clamp-2 text-sm whitespace-pre-wrap text-ink-soft">
                  {p.content}
                </p>
                <div className="flex items-center gap-2 border-t border-amber-200/70 pt-2">
                  <Link
                    href={`/dashboard/classrooms/${classroom.id}/posts?edit=${p.id}`}
                    className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
                  >
                    수정
                  </Link>
                  <form action={deletePost}>
                    <input type="hidden" name="classroom_id" value={classroom.id} />
                    <input type="hidden" name="post_id" value={p.id} />
                    <ConfirmSubmit
                      question="예약을 취소할까요?"
                      confirmLabel="예약 취소"
                      className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
                    >
                      취소
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 게시된 알림장 */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-ink">
          게시된 알림장 <span className={`tabular-nums ${theme.text}`}>{published.length}</span>개
        </h2>
        {published.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {published.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{p.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-faint tabular-nums">
                      {formatDate(p.post_date)}
                    </span>
                    <form action={deletePost}>
                      <input type="hidden" name="classroom_id" value={classroom.id} />
                      <input type="hidden" name="post_id" value={p.id} />
                      <ConfirmSubmit
                        question="삭제할까요?"
                        confirmLabel="삭제"
                        className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        ×
                      </ConfirmSubmit>
                    </form>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap text-ink-soft">{p.content}</p>
                {renderReads(p.id)}
                {renderItems(p.id)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center">
            <span className="text-2xl">📝</span>
            <p className="font-hand text-lg text-ink-soft">
              아직 게시된 알림장이 없습니다.
              <br />첫 알림장을 쓰면 학생들 화면에 바로 나타나요.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
