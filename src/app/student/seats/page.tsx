import Link from "next/link";
import { redirect } from "next/navigation";
import { SeatChart } from "@/components/SeatChart";
import { getStudentSession } from "@/lib/student-auth";
import { createStudentClient } from "@/lib/supabase/student";
import type { SeatingResult } from "@/lib/tools/seating";

export default async function StudentSeatsPage() {
  const session = await getStudentSession();
  if (!session) redirect("/student/login");

  const supabase = createStudentClient(session.token);
  // RLS: 학생은 is_public=true 결과만 읽힌다
  const { data } = await supabase
    .from("tool_results")
    .select("data")
    .eq("tool_key", "seating")
    .maybeSingle();

  const result = data?.data as SeatingResult | undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 p-5">
      <nav>
        <Link href="/student" className="text-blue-600 underline">
          ← 홈으로
        </Link>
      </nav>

      <h1 className="text-2xl font-extrabold">🪑 우리 반 자리</h1>

      {result ? (
        <div className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
          <SeatChart result={result} />
        </div>
      ) : (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-gray-400">
          🪑 아직 공개된 자리표가 없어요.
          <br />
          선생님이 자리를 정하면 여기에 보여요!
        </p>
      )}
    </main>
  );
}
