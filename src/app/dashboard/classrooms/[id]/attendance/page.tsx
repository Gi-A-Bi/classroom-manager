import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { DAY_NAMES, dayOfWeekMon1, toDateString, todayString } from "@/lib/dates";
import { type AttendanceType } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/server";
import { AttendanceGrid } from "./AttendanceGrid";

function shiftDate(dateStr: string, delta: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toDateString(d);
}

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date: dateParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayString();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  const [{ data: classroom }, { data: students }, { data: records }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name, theme_color")
        .eq("id", id)
        .single(),
      supabase
        .from("students")
        .select("id, number, nickname")
        .eq("classroom_id", id)
        .order("number"),
      supabase
        .from("attendance_records")
        .select("student_id, type, reason, memo")
        .eq("classroom_id", id)
        .eq("record_date", date),
    ]);

  if (!classroom) notFound();

  const initialRecords = Object.fromEntries(
    (records ?? []).map((r) => [
      r.student_id,
      { type: r.type as AttendanceType, reason: r.reason, memo: r.memo },
    ]),
  );

  const d = new Date(date + "T00:00:00");
  const dowLabel = DAY_NAMES[dayOfWeekMon1(d) - 1];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="attendance"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="출결"
        themeColor={classroom.theme_color}
      />
      <p className="-mt-3 text-sm text-ink-soft">
        🔒 나이스 공식 출결이 아닌, 선생님용 학급 관리 보조 기록이에요.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/classrooms/${classroom.id}/attendance?date=${shiftDate(date, -1)}`}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            ← 어제
          </Link>
          <span className="text-lg font-bold tabular-nums text-ink">
            {Number(date.slice(5, 7))}월 {Number(date.slice(8))}일 ({dowLabel})
            {date === today && (
              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                오늘
              </span>
            )}
          </span>
          <Link
            href={`/dashboard/classrooms/${classroom.id}/attendance?date=${shiftDate(date, 1)}`}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-soft"
          >
            내일 →
          </Link>
        </div>
        <div className="flex gap-2 text-sm">
          {date !== today && (
            <Link
              href={`/dashboard/classrooms/${classroom.id}/attendance`}
              className="rounded-lg border border-line bg-paper px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-soft"
            >
              오늘로
            </Link>
          )}
          <Link
            href={`/dashboard/classrooms/${classroom.id}/attendance/monthly`}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-soft"
          >
            월별
          </Link>
          <Link
            href={`/dashboard/classrooms/${classroom.id}/attendance/summary`}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-ink-soft transition-colors hover:bg-paper-soft"
          >
            학생별 집계
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        {students && students.length > 0 ? (
          <AttendanceGrid
            key={date}
            classroomId={classroom.id}
            date={date}
            students={students}
            initialRecords={initialRecords}
          />
        ) : (
          <p className="text-sm text-ink-faint">먼저 학생 명렬을 등록해주세요.</p>
        )}
      </section>

      <p className="text-xs text-ink-faint">
        전원 출석이 기본이에요. 결석·지각·조퇴·결과인 학생만 눌러서 상태와 사유를
        정하면 바로 저장돼요.
      </p>
    </main>
  );
}
