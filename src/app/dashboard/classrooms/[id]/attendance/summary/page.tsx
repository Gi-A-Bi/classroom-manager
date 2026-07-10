import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { createClient } from "@/lib/supabase/server";

export default async function AttendanceSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
        .select("student_id, type, reason")
        .eq("classroom_id", id),
    ]);

  if (!classroom) notFound();

  // 학생별 집계: 결석/지각/조퇴/결과 횟수 + 체험학습 누적 일수
  type Tally = { absent: number; late: number; early: number; result: number; field: number };
  const tally = new Map<string, Tally>();
  for (const s of students ?? []) {
    tally.set(s.id, { absent: 0, late: 0, early: 0, result: 0, field: 0 });
  }
  for (const r of records ?? []) {
    const t = tally.get(r.student_id);
    if (!t) continue;
    if (r.type === "absent") {
      t.absent += 1;
      if (r.reason === "체험학습") t.field += 1;
    } else if (r.type === "late") t.late += 1;
    else if (r.type === "early") t.early += 1;
    else if (r.type === "result") t.result += 1;
  }

  const cell = (n: number, cls: string) =>
    n > 0 ? (
      <span className={`rounded-md px-2 py-0.5 font-bold tabular-nums ${cls}`}>{n}</span>
    ) : (
      <span className="text-gray-300">·</span>
    );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="attendance" />

      <ClassroomHeader
        name={classroom.name}
        title="출결"
        themeColor={classroom.theme_color}
      />

      <nav className="-mt-2 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/dashboard/classrooms/${classroom.id}/attendance`}
          className="text-blue-600 underline"
        >
          ← 오늘 입력
        </Link>
        <Link
          href={`/dashboard/classrooms/${classroom.id}/attendance/monthly`}
          className="text-blue-600 underline"
        >
          🗓️ 월별 현황
        </Link>
      </nav>

      <h1 className="text-xl font-extrabold">👤 학생별 누적 집계</h1>
      <p className="-mt-3 text-sm text-gray-500">
        전체 기간 누적이에요. 체험학습은 결석 중 별도로 일수를 세요.
      </p>

      <div className="overflow-x-auto rounded-xl border bg-white p-3 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="border bg-gray-50 p-2 text-left">학생</th>
              <th className="border bg-gray-50 p-2">결석</th>
              <th className="border bg-gray-50 p-2">지각</th>
              <th className="border bg-gray-50 p-2">조퇴</th>
              <th className="border bg-gray-50 p-2">결과</th>
              <th className="border bg-gray-50 p-2">체험학습(일)</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).map((s) => {
              const t = tally.get(s.id)!;
              return (
                <tr key={s.id}>
                  <th className="whitespace-nowrap border bg-gray-50 p-2 text-left font-medium">
                    <span className="tabular-nums text-gray-400">{s.number}</span>{" "}
                    {s.nickname}
                  </th>
                  <td className="border p-2 text-center">
                    {cell(t.absent, "bg-red-100 text-red-700")}
                  </td>
                  <td className="border p-2 text-center">
                    {cell(t.late, "bg-amber-100 text-amber-700")}
                  </td>
                  <td className="border p-2 text-center">
                    {cell(t.early, "bg-orange-100 text-orange-700")}
                  </td>
                  <td className="border p-2 text-center">
                    {cell(t.result, "bg-purple-100 text-purple-700")}
                  </td>
                  <td className="border p-2 text-center">
                    {cell(t.field, "bg-teal-100 text-teal-700")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
