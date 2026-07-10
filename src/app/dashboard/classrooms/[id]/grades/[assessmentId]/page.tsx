import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { formatKoreanDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { GradeGrid } from "./GradeGrid";

const KIND_LABEL: Record<string, string> = {
  score: "점수형",
  level: "단계형",
  text: "서술형",
};

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id, assessmentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: assessment }, { data: students }, { data: results }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name, theme_color")
        .eq("id", id)
        .single(),
      supabase
        .from("assessments")
        .select("id, subject_id, title, assess_date, kind, max_score, levels, subjects(name)")
        .eq("id", assessmentId)
        .maybeSingle(),
      supabase
        .from("students")
        .select("id, number, nickname")
        .eq("classroom_id", id)
        .order("number"),
      supabase
        .from("assessment_results")
        .select("student_id, value")
        .eq("assessment_id", assessmentId),
    ]);

  if (!classroom || !assessment) notFound();

  const initialValues = Object.fromEntries(
    (results ?? []).map((r) => [r.student_id, r.value]),
  );

  // 기본 통계
  const total = students?.length ?? 0;
  const answered = results?.length ?? 0;
  let stats: React.ReactNode = null;

  if (assessment.kind === "score") {
    const nums = (results ?? [])
      .map((r) => Number(r.value))
      .filter((n) => Number.isFinite(n));
    if (nums.length > 0) {
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      stats = (
        <div className="flex flex-wrap gap-2">
          {[
            ["평균", (Math.round(avg * 10) / 10).toLocaleString()],
            ["최고", Math.max(...nums).toLocaleString()],
            ["최저", Math.min(...nums).toLocaleString()],
            ["입력", `${answered}/${total}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-paper-soft px-4 py-2 text-center">
              <p className="text-xs text-ink-faint">{label}</p>
              <p className="text-lg font-bold tabular-nums text-ink">{value}</p>
            </div>
          ))}
        </div>
      );
    }
  } else if (assessment.kind === "level") {
    const counts = new Map<string, number>();
    for (const r of results ?? []) {
      counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
    }
    stats = (
      <div className="flex flex-wrap gap-2">
        {(assessment.levels ?? []).map((l) => (
          <div key={l} className="rounded-xl bg-paper-soft px-4 py-2 text-center">
            <p className="text-xs text-ink-faint">{l}</p>
            <p className="text-lg font-bold tabular-nums text-ink">{counts.get(l) ?? 0}명</p>
          </div>
        ))}
        <div className="rounded-xl bg-paper-soft px-4 py-2 text-center">
          <p className="text-xs text-ink-faint">입력</p>
          <p className="text-lg font-bold tabular-nums text-ink">
            {answered}/{total}
          </p>
        </div>
      </div>
    );
  } else {
    stats = (
      <p className="text-sm text-ink-soft">
        입력 <strong className="tabular-nums text-ink">{answered}</strong>/{total}명
      </p>
    );
  }

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
          href={`/dashboard/classrooms/${classroom.id}/grades?subject=${assessment.subject_id}`}
          className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink"
        >
          ← {assessment.subjects?.name} 평가 목록
        </Link>
      </nav>

      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-ink">{assessment.title}</h1>
        <span className="rounded-full bg-paper-soft px-2 py-0.5 text-xs font-medium text-ink-soft">
          {KIND_LABEL[assessment.kind]}
          {assessment.kind === "score" && assessment.max_score !== null && ` · 만점 ${assessment.max_score}`}
        </span>
        <span className="text-sm text-ink-faint tabular-nums">
          {formatKoreanDate(assessment.assess_date)}
        </span>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">통계</h2>
        {answered > 0 ? stats : (
          <p className="text-sm text-ink-faint">아직 입력된 결과가 없어요.</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">입력</h2>
        {students && students.length > 0 ? (
          <GradeGrid
            assessment={{
              id: assessment.id,
              kind: assessment.kind as "score" | "level" | "text",
              max_score:
                assessment.max_score !== null ? Number(assessment.max_score) : null,
              levels: assessment.levels,
            }}
            students={students}
            initialValues={initialValues}
          />
        ) : (
          <p className="text-sm text-ink-faint">
            먼저 학생 명렬을 등록해주세요.
          </p>
        )}
      </section>
    </main>
  );
}
