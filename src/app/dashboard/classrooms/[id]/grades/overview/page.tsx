import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { createClient } from "@/lib/supabase/server";
import { GradeOverviewGrid } from "./GradeOverviewGrid";

// 셀 요약을 계산해 클라이언트 그리드로 넘긴다.
// 점수형=평균(정규화 0~1), 단계형=최빈 단계(순위 정규화), 텍스트형="기록"
export default async function GradeOverviewPage({
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
        .select("id, subject_id, title, assess_date, kind, max_score, levels")
        .eq("classroom_id", id)
        .order("assess_date"),
    ]);

  if (!classroom) notFound();

  const assessmentIds = (assessments ?? []).map((a) => a.id);
  const { data: results } =
    assessmentIds.length > 0
      ? await supabase
          .from("assessment_results")
          .select("assessment_id, student_id, value")
          .in("assessment_id", assessmentIds)
      : { data: [] };

  type Assessment = NonNullable<typeof assessments>[number];
  const assessmentById = new Map<string, Assessment>(
    (assessments ?? []).map((a) => [a.id, a]),
  );

  // (student, subject) → 결과값 배열
  const bucket = new Map<string, { assessment: Assessment; value: string }[]>();
  for (const r of results ?? []) {
    const a = assessmentById.get(r.assessment_id);
    if (!a) continue;
    const key = `${r.student_id}:${a.subject_id}`;
    const list = bucket.get(key) ?? [];
    list.push({ assessment: a, value: r.value });
    bucket.set(key, list);
  }

  type Cell = {
    label: string;
    intensity: number | null; // 0~1, null=미입력
    detail: { title: string; date: string; value: string; max: number | null }[];
  };

  const cellFor = (studentId: string, subjectId: string): Cell => {
    const items = bucket.get(`${studentId}:${subjectId}`) ?? [];
    const detail = items
      .map((it) => ({
        title: it.assessment.title,
        date: it.assessment.assess_date,
        value: it.value,
        max: it.assessment.max_score !== null ? Number(it.assessment.max_score) : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (items.length === 0) return { label: "", intensity: null, detail };

    // 점수형: 정규화 평균
    const scores = items.filter((it) => it.assessment.kind === "score");
    if (scores.length > 0 && scores.length >= items.length / 2) {
      const ratios = scores
        .map((it) => {
          const n = Number(it.value);
          if (!Number.isFinite(n)) return null;
          const max = it.assessment.max_score !== null ? Number(it.assessment.max_score) : 100;
          return max > 0 ? n / max : null;
        })
        .filter((x): x is number => x !== null);
      if (ratios.length > 0) {
        const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const rawAvg =
          scores
            .map((it) => Number(it.value))
            .filter((n) => Number.isFinite(n))
            .reduce((a, b) => a + b, 0) / ratios.length;
        return {
          label: String(Math.round(rawAvg * 10) / 10),
          intensity: Math.max(0, Math.min(1, avg)),
          detail,
        };
      }
    }

    // 단계형: 최빈 단계 → 순위 정규화 (첫 단계=최고)
    const levelItems = items.filter((it) => it.assessment.kind === "level");
    if (levelItems.length > 0) {
      const counts = new Map<string, number>();
      for (const it of levelItems) counts.set(it.value, (counts.get(it.value) ?? 0) + 1);
      const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const levels = levelItems[0].assessment.levels ?? [];
      const rank = levels.indexOf(mode);
      const intensity =
        levels.length > 1 && rank >= 0 ? 1 - rank / (levels.length - 1) : 0.5;
      return { label: mode, intensity, detail };
    }

    // 텍스트형만
    return { label: "기록", intensity: 0.5, detail };
  };

  const grid = (students ?? []).map((s) => ({
    student: s,
    cells: (subjects ?? []).map((sub) => ({
      subjectId: sub.id,
      ...cellFor(s.id, sub.id),
    })),
  }));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="grades"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="성적 기록"
        themeColor={classroom.theme_color}
      />

      <nav className="-mt-2 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/dashboard/classrooms/${classroom.id}/grades`}
          className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink"
        >
          ← 과목·평가 목록
        </Link>
        <Link
          href={`/dashboard/classrooms/${classroom.id}/grades/students`}
          className="text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink"
        >
          학생별 보기
        </Link>
      </nav>

      <h1 className="text-xl font-bold text-ink">종합 보기</h1>
      <p className="-mt-3 text-sm text-ink-soft">
        칸을 클릭하면 그 학생·과목의 평가 상세가 펼쳐져요. 색이 진할수록 성취도가
        높아요. 점수형은 평균, 단계형은 가장 많은 단계를 보여줍니다.
      </p>

      {(subjects ?? []).length > 0 && (students ?? []).length > 0 ? (
        <GradeOverviewGrid
          subjects={(subjects ?? []).map((s) => ({ id: s.id, name: s.name }))}
          grid={grid}
        />
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center font-hand text-base text-ink-soft">
          과목과 학생, 평가 결과가 있어야 종합 표가 채워져요.
        </p>
      )}
    </main>
  );
}
