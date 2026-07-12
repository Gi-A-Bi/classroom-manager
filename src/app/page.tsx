import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { getStudentSession } from "@/lib/student-auth";
import { createClient } from "@/lib/supabase/server";

// 첫 화면: 로그인돼 있으면 각자 공간으로, 아니면 역할 선택 랜딩.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_mode")
      .eq("id", user.id)
      .single();
    redirect(profile?.last_mode === "work" ? "/work" : "/dashboard");
  }

  const studentSession = await getStudentSession();
  if (studentSession) redirect("/student");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 p-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-soft text-4xl ring-1 ring-line">
          📓
        </span>
        <h1 className="mt-4">
          <Wordmark size="lg" className="text-4xl" />
        </h1>
        <p className="mt-2 font-hand text-lg text-ink-soft">
          우리 반의 하루가 한곳에 모여요.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/student/login"
          className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-5 transition-colors hover:bg-paper-soft"
        >
          <span className="text-3xl" aria-hidden>
            🎒
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold text-ink">학생</span>
            <span className="block text-sm text-ink-soft">
              학급코드와 출석번호로 들어가요
            </span>
          </span>
          <span className="ml-auto text-ink-faint" aria-hidden>
            →
          </span>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-5 transition-colors hover:bg-paper-soft"
        >
          <span className="text-3xl" aria-hidden>
            🧑‍🏫
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold text-ink">선생님</span>
            <span className="block text-sm text-ink-soft">
              이메일로 로그인하거나 가입해요
            </span>
          </span>
          <span className="ml-auto text-ink-faint" aria-hidden>
            →
          </span>
        </Link>
      </div>

      <p className="text-center text-sm text-ink-faint">
        학부모님은 담임 선생님이 보내주신
        <br />
        캘린더 공유 링크로 바로 보실 수 있어요.
      </p>
    </main>
  );
}
