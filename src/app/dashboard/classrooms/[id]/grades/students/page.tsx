import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { formatKoreanDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const KIND_STYLE: Record<string, string> = {
  score: "bg-blue-100 text-blue-700",
  level: "bg-purple-100 text-purple-700",
  text: "bg-teal-100 text-teal-700",
};

export default async function GradesByStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ student?: string; subject?: string }>;
}) {
  const { id } = await params;
  const { student: studentParam, subject: subjectParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: students }, { data: subjects }, { data: assessments }] =
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
        .from("subjects")
        .select("id, name")
        .eq("classroom_id", id)
        .order("position"),
      supabase
        .from("assessments")
        .select("id, subject_id, title, assess_date, kind, max_score")
        .eq("classroom_id", id)
        .order("assess_date", { ascending: false }),
    ]);

  if (!classroom) notFound();

  const selectedStudent =
    (students ?? []).find((s) => s.id === studentParam) ?? (students ?? [])[0];
  const selectedSubject = (subjects ?? []).find((s) => s.id === subjectParam);

  const { data: results } = selectedStudent
    ? await supabase
        .from("assessment_results")
        .select("assessment_id, value")
        .eq("classroom_id", id)
        .eq("student_id", selectedStudent.id)
    : { data: [] };

  const valueOf = new Map((results ?? []).map((r) => [r.assessment_id, r.value]));
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const rows = (assessments ?? [])
    .filter((a) => !selectedSubject || a.subject_id === selectedSubject.id)
    .filter((a) => valueOf.has(a.id));

  const buildUrl = (student?: string, subject?: string) => {
    const p = new URLSearchParams();
    if (student) p.set("student", student);
    if (subject) p.set("subject", subject);
    const qs = p.toString();
    return `/dashboard/classrooms/${id}/grades/students${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="grades"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="성적 기록"
        themeColor={classroom.theme_color}
      />

      <nav className="-mt-2 text-sm">
        <Link
          href={`/dashboard/classrooms/${classroom.id}/grades`}
          className="text-blue-600 underline"
        >
          ← 과목·평가 목록
        </Link>
      </nav>

      <h1 className="text-xl font-extrabold">👤 학생별 누적 보기</h1>

      <div className="flex flex-wrap gap-1.5">
        {(students ?? []).map((s) => (
          <Link
            key={s.id}
            href={buildUrl(s.id, selectedSubject?.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedStudent?.id === s.id
                ? "bg-gray-900 text-white"
                : "border bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s.number} {s.nickname}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildUrl(selectedStudent?.id)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            !selectedSubject ? "bg-gray-900 text-white" : "border bg-white text-gray-500"
          }`}
        >
          전 과목
        </Link>
        {(subjects ?? []).map((s) => (
          <Link
            key={s.id}
            href={buildUrl(selectedStudent?.id, s.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedSubject?.id === s.id
                ? "bg-gray-900 text-white"
                : "border bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {selectedStudent ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold tracking-wide text-gray-400">
            {selectedStudent.number}번 {selectedStudent.nickname} ·{" "}
            {selectedSubject ? selectedSubject.name : "전 과목"} · {rows.length}건
            (최신순)
          </h2>
          {rows.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {rows.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3.5 text-sm shadow-sm"
                >
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {subjectName.get(a.subject_id)}
                  </span>
                  <Link
                    href={`/dashboard/classrooms/${classroom.id}/grades/${a.id}`}
                    className="font-medium hover:underline"
                  >
                    {a.title}
                  </Link>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {formatKoreanDate(a.assess_date)}
                  </span>
                  <span
                    className={`ml-auto rounded-lg px-2.5 py-1 font-bold ${KIND_STYLE[a.kind]}`}
                  >
                    {valueOf.get(a.id)}
                    {a.kind === "score" && a.max_score !== null && (
                      <span className="font-normal opacity-60">/{Number(a.max_score)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-gray-400">
              📊 아직 입력된 결과가 없어요.
            </p>
          )}
        </section>
      ) : (
        <p className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-gray-400">
          먼저 학생 명렬을 등록해주세요.
        </p>
      )}
    </main>
  );
}
