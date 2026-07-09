import Link from "next/link";
import { redirect } from "next/navigation";
import { DAY_NAMES, dayOfWeekMon1, todayString } from "@/lib/dates";
import { getStudentSession } from "@/lib/student-auth";
import { createStudentClient } from "@/lib/supabase/student";
import { studentLogout } from "./login/actions";

function formatDate(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function StudentHomePage() {
  const session = await getStudentSession();
  if (!session) redirect("/student/login");

  const todayDow = dayOfWeekMon1(); // 1=월 … 7=일
  const isWeekday = todayDow <= 5;
  const today = todayString();

  // RLS가 JWT의 classroom_id 클레임으로 자기 학급 데이터만 허용한다
  const supabase = createStudentClient(session.token);

  const [{ data: classroom }, { data: posts }, { data: todaySlots }, { data: todayEvents }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("name")
        .eq("id", session.classroomId)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("id, title, post_date")
        .order("post_date", { ascending: false })
        .order("created_at", { ascending: false }),
      isWeekday
        ? supabase
            .from("timetable_slots")
            .select("period, subject")
            .eq("day_of_week", todayDow)
            .order("period")
        : Promise.resolve({ data: [] as { period: number; subject: string }[] }),
      supabase
        .from("events")
        .select("id, title, layer")
        .eq("event_date", today),
    ]);

  // 학급이 조회되지 않으면 세션이 낡은 것 (학급 삭제 등)
  if (!classroom) redirect("/student/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{classroom.name}</h1>
          <p className="text-sm text-gray-600">
            {session.number}번 {session.nickname}
          </p>
        </div>
        <form action={studentLogout}>
          <button type="submit" className="text-sm text-gray-500 underline">
            나가기
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            오늘의 시간표{" "}
            <span className="text-sm font-normal text-gray-500">
              ({DAY_NAMES[todayDow - 1]}요일)
            </span>
          </h2>
          <Link href="/student/calendar" className="text-sm text-blue-600 underline">
            캘린더 보기
          </Link>
        </div>
        {isWeekday && todaySlots && todaySlots.length > 0 ? (
          <ol className="flex flex-col gap-1">
            {todaySlots.map((s) => (
              <li
                key={s.period}
                className="flex items-center gap-3 rounded-lg border-2 px-3 py-2"
              >
                <span className="w-10 shrink-0 font-mono text-sm text-gray-500">
                  {s.period}교시
                </span>
                <span className="font-medium">{s.subject}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border-2 border-dashed p-4 text-center text-sm text-gray-500">
            {isWeekday ? "오늘 시간표가 아직 없어요." : "오늘은 쉬는 날이에요!"}
          </p>
        )}
        {todayEvents && todayEvents.length > 0 && (
          <ul className="flex flex-col gap-1">
            {todayEvents.map((e) => (
              <li
                key={e.id}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  e.layer === "school"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                오늘: {e.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">알림장</h2>
        {posts && posts.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/student/posts/${p.id}`}
                  className="flex items-center justify-between rounded-xl border-2 p-4 active:bg-gray-50"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="shrink-0 text-sm text-gray-500">
                    {formatDate(p.post_date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed p-6 text-center text-gray-500">
            아직 알림장이 없어요.
          </p>
        )}
      </section>
    </main>
  );
}
