import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";
import { createPost } from "./actions";

function formatDate(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function ClassroomPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: posts }, { data: students }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name, class_code, theme_color")
        .eq("id", id)
        .single(),
      supabase
        .from("posts")
        .select("id, title, content, post_date")
        .eq("classroom_id", id)
        .order("post_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("students")
        .select("id, number, nickname")
        .eq("classroom_id", id)
        .order("number"),
    ]);

  if (!classroom) notFound();

  const postIds = (posts ?? []).map((p) => p.id);

  const [{ data: reads }, { data: items }] =
    postIds.length > 0
      ? await Promise.all([
          supabase
            .from("post_reads")
            .select("post_id, student_id")
            .in("post_id", postIds),
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
      ? await supabase
          .from("item_checks")
          .select("item_id, student_id")
          .in("item_id", itemIds)
      : { data: [] };

  const readSet = new Set((reads ?? []).map((r) => `${r.post_id}:${r.student_id}`));
  const checkCount = new Map<string, number>();
  for (const c of checks ?? []) {
    checkCount.set(c.item_id, (checkCount.get(c.item_id) ?? 0) + 1);
  }

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const totalStudents = students?.length ?? 0;
  const theme = getTheme(classroom.theme_color);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="posts"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="알림장"
        classCode={classroom.class_code}
        themeColor={classroom.theme_color}
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">알림장 쓰기</h2>
        <form action={createPost} className="flex flex-col gap-3">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <div className="flex gap-2">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              날짜
              <input
                type="date"
                name="post_date"
                required
                defaultValue={todayString}
                className="rounded-lg border border-line bg-paper-soft p-2 text-ink"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-ink-soft">
              제목
              <input
                type="text"
                name="title"
                required
                placeholder="7월 9일 알림장"
                className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            내용
            <textarea
              name="content"
              required
              rows={5}
              placeholder={"1. 우유급식 신청서 제출\n2. 목요일 현장체험학습"}
              className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            준비물 체크리스트 (선택 — 한 줄에 하나씩, 학생이 항목별로 체크)
            <textarea
              name="items"
              rows={3}
              placeholder={"색연필\n가위"}
              className="rounded-lg border border-line bg-paper-soft p-2 text-ink placeholder:text-ink-faint"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            등록
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-ink">
          작성한 알림장{" "}
          <span className={`tabular-nums ${theme.text}`}>
            {posts?.length ?? 0}
          </span>
          개
        </h2>
        {posts && posts.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {posts.map((p) => {
              const readCount =
                students?.filter((s) => readSet.has(`${p.id}:${s.id}`)).length ??
                0;
              const postItems = (items ?? []).filter(
                (i) => i.post_id === p.id,
              );
              return (
                <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-ink">{p.title}</h3>
                    <span className="text-sm text-ink-faint tabular-nums">
                      {formatDate(p.post_date)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-ink-soft">
                    {p.content}
                  </p>

                  {totalStudents > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                      <span className="text-sm font-medium text-ink">
                        읽음{" "}
                        <strong
                          className={`tabular-nums ${readCount === totalStudents ? "text-green-600" : theme.text}`}
                        >
                          {readCount}
                        </strong>
                        <span className="text-ink-faint">/{totalStudents}</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {students!.map((s) => {
                          const hasRead = readSet.has(`${p.id}:${s.id}`);
                          return (
                            <span
                              key={s.id}
                              title={`${s.number}번 ${s.nickname} — ${hasRead ? "읽음" : "안 읽음"}`}
                              className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs ${
                                hasRead
                                  ? "bg-green-500 font-bold text-white"
                                  : "bg-paper-soft text-ink-faint"
                              }`}
                            >
                              {s.number}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {postItems.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-line pt-3">
                      <span className="text-sm font-medium text-ink">
                        준비물 체크 현황
                      </span>
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
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center">
            <span className="text-2xl">📝</span>
            <p className="font-hand text-lg text-ink-soft">
              아직 알림장이 없습니다.
              <br />첫 알림장을 쓰면 학생들 화면에 바로 나타나요.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
