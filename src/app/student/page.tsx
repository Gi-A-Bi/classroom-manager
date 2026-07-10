import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentNav } from "@/components/StudentNav";
import {
  DAY_NAMES,
  dayOfWeekMon1,
  daysBetween,
  formatMonthDay,
  todayString,
} from "@/lib/dates";
import { getStudentSession } from "@/lib/student-auth";
import { createStudentClient } from "@/lib/supabase/student";
import { getTheme, pastelChip } from "@/lib/themes";
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

  const [
    { data: classroom },
    { data: posts },
    { data: todaySlots },
    { data: todayEvents },
    { data: myReads },
  ] = await Promise.all([
    supabase
      .from("classrooms")
      .select("name, theme_color")
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
      .lte("event_date", today)
      .or(`end_date.gte.${today},event_date.eq.${today}`),
    supabase
      .from("post_reads")
      .select("post_id")
      .eq("student_id", session.studentId),
  ]);

  // 학급이 조회되지 않으면 세션이 낡은 것 (학급 삭제 등)
  if (!classroom) redirect("/student/login");

  // 다가오는 일정 D-day
  const { data: nextEvents } = await supabase
    .from("events")
    .select("title, event_date")
    .gt("event_date", today)
    .order("event_date")
    .limit(1);
  const nextEvent = nextEvents?.[0] ?? null;
  const dday = nextEvent ? daysBetween(today, nextEvent.event_date) : null;

  // 담임 선생님이 학생에게 공개한 도구 링크 (RLS로 공개분만)
  const { data: tools } = await supabase
    .from("class_tools")
    .select("id, name, url, color")
    .eq("is_student_visible", true)
    .order("position");

  const theme = getTheme(classroom.theme_color);
  const readSet = new Set((myReads ?? []).map((r) => r.post_id));

  // 오늘 알림장 1건은 크게, 나머지는 목록으로
  const todayPost = (posts ?? []).find((p) => p.post_date === today);
  const otherPosts = (posts ?? []).filter((p) => p.id !== todayPost?.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 p-4">
      <StudentNav current="home" themeColor={classroom.theme_color} />

      {/* 히어로 — 테마색 종이 헤더 */}
      <header className={`overflow-hidden rounded-2xl ${theme.soft}`}>
        <div className={`h-1.5 ${theme.topbar}`} />
        <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-bold ${theme.text}`}>
              {classroom.name}
              <span className="font-medium text-ink-soft">
                {" "}
                · {session.number}번 {session.nickname}
              </span>
            </p>
            <form action={studentLogout}>
              <button
                type="submit"
                className="rounded-lg bg-paper/80 px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper"
              >
                나가기
              </button>
            </form>
          </div>
          <h1 className="font-display text-4xl leading-none tracking-tight text-ink tabular-nums">
            <span className="align-middle text-2xl">
              {isWeekday ? "☀️" : "🌈"}
            </span>{" "}
            {Number(today.slice(5, 7))}월 {Number(today.slice(8))}일{" "}
            <span className="text-xl text-ink-faint">
              {DAY_NAMES[todayDow - 1]}
            </span>
          </h1>
          {nextEvent && dday !== null && (
            <p className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-paper px-2.5 py-0.5 font-bold tabular-nums text-rose-500">
                D-{dday}
              </span>
              <span className="font-medium text-ink">{nextEvent.title}</span>
              <span className="text-ink-faint tabular-nums">
                {formatMonthDay(nextEvent.event_date)}
              </span>
            </p>
          )}
        </div>
      </header>

      {/* 오늘 시간표 */}
      <section className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4">
        <h2 className="font-bold text-ink">
          ⏰ 오늘 시간표{" "}
          <span className="text-sm font-normal text-ink-faint">
            {DAY_NAMES[todayDow - 1]}요일
          </span>
        </h2>
        {isWeekday && todaySlots && todaySlots.length > 0 ? (
          <ol className="flex flex-wrap gap-1.5">
            {todaySlots.map((s, i) => (
              <li
                key={s.period}
                className={`rounded-xl px-2.5 py-1.5 text-sm ${pastelChip(i)}`}
              >
                <span className="font-bold tabular-nums">{s.period}교시</span>{" "}
                <span className="font-semibold">{s.subject}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-hand text-base text-ink-soft">
            {isWeekday
              ? "📭 오늘 시간표가 아직 없어요"
              : "🌤️ 오늘은 쉬는 날이에요!"}
          </p>
        )}
        {todayEvents && todayEvents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {todayEvents.map((e) => (
              <span
                key={e.id}
                className={`rounded-lg px-2.5 py-1 text-sm font-medium ${
                  e.layer === "school"
                    ? "bg-orange-100 text-orange-800"
                    : `${theme.soft} ${theme.text}`
                }`}
              >
                오늘 · {e.title}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 오늘 알림장 — 별표 카드 */}
      {todayPost && (
        <Link
          href={`/student/posts/${todayPost.id}`}
          className="flex flex-col gap-1 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 transition-transform active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-amber-700">
            🔔 오늘 알림장
            {!readSet.has(todayPost.id) && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
                안 읽음
              </span>
            )}
          </span>
          <span className="text-lg font-bold text-amber-900">
            {todayPost.title}
          </span>
          <span className="font-hand text-base text-amber-700">
            눌러서 읽어보세요 →
          </span>
        </Link>
      )}

      {/* 우리 반 링크 */}
      {tools && tools.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-bold text-ink-soft">🧰 우리 반 링크</h2>
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => {
              const tt = getTheme(t.color);
              return (
                <a
                  key={t.id}
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-xl px-3.5 py-2.5 text-sm font-bold transition-transform hover:scale-105 ${tt.soft} ${tt.text}`}
                >
                  🔗 {t.name} ↗
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* 지난 알림장 */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-bold text-ink-soft">📚 지난 알림장</h2>
        {otherPosts.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {otherPosts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/student/posts/${p.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper p-3.5 transition-colors active:bg-paper-soft"
                >
                  <span className="flex items-center gap-2 font-medium text-ink">
                    {p.title}
                    {!readSet.has(p.id) && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
                        안 읽음
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-ink-faint tabular-nums">
                    {formatDate(p.post_date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !todayPost && (
            <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-6 text-center">
              <span className="text-2xl">📮</span>
              <p className="font-hand text-base text-ink-soft">
                아직 알림장이 없어요.
                <br />
                선생님이 쓰면 여기에 나타나요!
              </p>
            </div>
          )
        )}
      </section>
    </main>
  );
}
