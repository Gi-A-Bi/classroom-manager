import { notFound, redirect } from "next/navigation";
import { ClassroomNav } from "@/components/ClassroomNav";
import { createClient } from "@/lib/supabase/server";
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

  const [{ data: classroom }, { data: posts }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, class_code")
      .eq("id", id)
      .single(),
    supabase
      .from("posts")
      .select("id, title, content, post_date")
      .eq("classroom_id", id)
      .order("post_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!classroom) notFound();

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <ClassroomNav classroomId={classroom.id} current="posts" />

      <header>
        <h1 className="text-2xl font-bold">{classroom.name} 알림장</h1>
        <p className="mt-1 text-sm text-gray-600">
          학급코드{" "}
          <code className="rounded bg-gray-100 px-2 py-1 font-mono font-bold">
            {classroom.class_code}
          </code>
        </p>
      </header>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">알림장 쓰기</h2>
        <form action={createPost} className="flex flex-col gap-3">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <div className="flex gap-2">
            <label className="flex flex-col gap-1 text-sm">
              날짜
              <input
                type="date"
                name="post_date"
                required
                defaultValue={todayString}
                className="rounded-md border p-2"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              제목
              <input
                type="text"
                name="title"
                required
                placeholder="7월 9일 알림장"
                className="rounded-md border p-2"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            내용
            <textarea
              name="content"
              required
              rows={5}
              placeholder={"1. 내일 준비물: 색연필\n2. 우유급식 신청서 제출"}
              className="rounded-md border p-2"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            등록
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">작성한 알림장 {posts?.length ?? 0}개</h2>
        {posts && posts.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <li key={p.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{p.title}</h3>
                  <span className="text-sm text-gray-500">
                    {formatDate(p.post_date)}
                  </span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap text-gray-700">
                  {p.content}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">아직 작성한 알림장이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
