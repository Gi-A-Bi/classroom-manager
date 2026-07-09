import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-auth";
import { createStudentClient } from "@/lib/supabase/student";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 p-5">
      <nav>
        <Link href="/student" className="text-blue-600 underline">
          ← 알림장 목록
        </Link>
      </nav>

      <article className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">{formatDate(post.post_date)}</p>
        <h1 className="text-2xl font-bold">{post.title}</h1>
        <div className="rounded-xl border-2 p-4 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
      </article>
    </main>
  );
}
