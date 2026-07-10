import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { formatKoreanDate, todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { addAssessment, addSubject, deleteAssessment, deleteSubject, renameSubject } from "./actions";

const KIND_LABEL: Record<string, string> = {
  score: "점수형",
  level: "단계형",
  text: "서술형",
};
const KIND_STYLE: Record<string, string> = {
  score: "bg-blue-100 text-blue-700",
  level: "bg-purple-100 text-purple-700",
  text: "bg-teal-100 text-teal-700",
};

export default async function GradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; subject?: string }>;
}) {
  const { id } = await params;
  const { error, subject: subjectParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: subjects }] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name, theme_color")
      .eq("id", id)
      .single(),
    supabase
      .from("subjects")
      .select("id, name")
      .eq("classroom_id", id)
      .order("position"),
  ]);

  if (!classroom) notFound();

  const selected =
    (subjects ?? []).find((s) => s.id === subjectParam) ?? (subjects ?? [])[0];

  const { data: assessments } = selected
    ? await supabase
        .from("assessments")
        .select("id, title, assess_date, kind, max_score, levels")
        .eq("subject_id", selected.id)
        .order("assess_date", { ascending: false })
    : { data: [] };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="grades"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="성적 기록"
        themeColor={classroom.theme_color}
      />
      <div className="-mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          🔒 선생님만 볼 수 있어요. 학생 화면에는 나타나지 않습니다.
        </p>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/dashboard/classrooms/${classroom.id}/grades/overview`}
            className="rounded-lg border bg-white px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-50"
          >
            📊 종합 보기
          </Link>
          <Link
            href={`/dashboard/classrooms/${classroom.id}/grades/students`}
            className="rounded-lg border bg-white px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-50"
          >
            👤 학생별 보기
          </Link>
          <a
            href={`/dashboard/classrooms/${classroom.id}/grades/export`}
            className="rounded-lg border bg-white px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-50"
          >
            ⬇️ 전체 CSV
          </a>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">📚 과목</h2>
        <div className="flex flex-wrap gap-1.5">
          {(subjects ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/classrooms/${classroom.id}/grades?subject=${s.id}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                selected?.id === s.id
                  ? "bg-gray-900 text-white"
                  : "border bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.name}
            </Link>
          ))}
          <form action={addSubject} className="flex gap-1.5">
            <input type="hidden" name="classroom_id" value={classroom.id} />
            <input
              type="text"
              name="name"
              required
              placeholder="새 과목"
              className="w-28 rounded-full border px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              + 추가
            </button>
          </form>
        </div>
        {selected && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
            <form action={renameSubject} className="flex items-center gap-1.5">
              <input type="hidden" name="classroom_id" value={classroom.id} />
              <input type="hidden" name="subject_id" value={selected.id} />
              <input
                type="text"
                name="name"
                defaultValue={selected.name}
                className="w-32 rounded-lg border px-2 py-1"
              />
              <button
                type="submit"
                className="rounded-lg border px-2.5 py-1 text-gray-600 transition-colors hover:bg-gray-50"
              >
                이름 변경
              </button>
            </form>
            <form action={deleteSubject}>
              <input type="hidden" name="classroom_id" value={classroom.id} />
              <input type="hidden" name="subject_id" value={selected.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-2.5 py-1 text-red-600 transition-colors hover:bg-red-50"
              >
                과목 삭제
              </button>
            </form>
            <a
              href={`/dashboard/classrooms/${classroom.id}/grades/export?subject=${selected.id}`}
              className="rounded-lg border px-2.5 py-1 text-gray-600 transition-colors hover:bg-gray-50"
            >
              ⬇️ {selected.name} CSV
            </a>
            <span className="text-xs text-gray-400">
              과목을 지우면 그 과목의 평가·결과도 함께 지워져요.
            </span>
          </div>
        )}
      </section>

      {selected ? (
        <>
          <section className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">✏️ {selected.name} 평가 만들기</h2>
            <form action={addAssessment} className="flex flex-col gap-3">
              <input type="hidden" name="classroom_id" value={classroom.id} />
              <input type="hidden" name="subject_id" value={selected.id} />
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm">
                  평가 이름
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="1학기 수행평가 - 받아쓰기 3회"
                    className="rounded-lg border p-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  날짜
                  <input
                    type="date"
                    name="assess_date"
                    required
                    defaultValue={todayString()}
                    className="rounded-lg border p-2"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  유형
                  <select name="kind" defaultValue="score" className="rounded-lg border p-2">
                    <option value="score">점수형</option>
                    <option value="level">단계형</option>
                    <option value="text">서술형</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  만점 <span className="text-xs text-gray-400">(점수형, 선택)</span>
                  <input
                    type="number"
                    name="max_score"
                    min={1}
                    placeholder="100"
                    className="w-24 rounded-lg border p-2"
                  />
                </label>
                <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
                  단계 <span className="text-xs text-gray-400">(단계형, 쉼표 구분)</span>
                  <input
                    type="text"
                    name="levels"
                    placeholder="잘함, 보통, 노력요함"
                    className="rounded-lg border p-2"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  만들고 입력하기
                </button>
              </div>
            </form>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-bold tracking-wide text-gray-400">
              {selected.name} 평가 {assessments?.length ?? 0}개
            </h2>
            {assessments && assessments.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {assessments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3.5 text-sm shadow-sm transition-shadow hover:shadow-md"
                  >
                    <Link
                      href={`/dashboard/classrooms/${classroom.id}/grades/${a.id}`}
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                    >
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[a.kind]}`}>
                        {KIND_LABEL[a.kind]}
                        {a.kind === "score" && a.max_score !== null && ` /${a.max_score}`}
                      </span>
                      <span className="font-semibold">{a.title}</span>
                      <span className="text-gray-400 tabular-nums">
                        {formatKoreanDate(a.assess_date)}
                      </span>
                      <span className="ml-auto text-blue-600">입력·보기 →</span>
                    </Link>
                    <form action={deleteAssessment}>
                      <input type="hidden" name="classroom_id" value={classroom.id} />
                      <input type="hidden" name="assessment_id" value={a.id} />
                      <input type="hidden" name="subject_id" value={selected.id} />
                      <button
                        type="submit"
                        title="평가 삭제"
                        className="rounded-md px-2 py-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-gray-400">
                ✏️ 첫 평가를 만들어보세요.
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-gray-400">
          📚 먼저 과목을 추가해주세요. (예: 국어, 수학, 통합교과)
        </p>
      )}
    </main>
  );
}
