import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { formatKoreanDate, todayString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { addRecord, deleteRecord } from "./actions";

const CATEGORIES = ["상담", "관찰", "칭찬", "기타"] as const;
const CATEGORY_STYLE: Record<string, string> = {
  상담: "bg-purple-100 text-purple-700",
  관찰: "bg-blue-100 text-blue-700",
  칭찬: "bg-green-100 text-green-700",
  기타: "bg-paper-soft text-ink-soft",
};

export default async function StudentRecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; student?: string; category?: string }>;
}) {
  const { id } = await params;
  const { error, student: studentParam, category } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: students }] = await Promise.all([
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
  ]);

  if (!classroom) notFound();

  const selectedStudent = (students ?? []).find((s) => s.id === studentParam);

  let query = supabase
    .from("student_records")
    .select("id, student_id, record_date, category, content")
    .eq("classroom_id", id)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (selectedStudent) query = query.eq("student_id", selectedStudent.id);
  if (category && CATEGORIES.includes(category as never)) {
    query = query.eq("category", category);
  }
  const { data: records } = await query;

  const studentName = new Map(
    (students ?? []).map((s) => [s.id, `${s.number}번 ${s.nickname}`]),
  );

  const buildUrl = (student?: string, cat?: string) => {
    const p = new URLSearchParams();
    if (student) p.set("student", student);
    if (cat) p.set("category", cat);
    const qs = p.toString();
    return `/dashboard/classrooms/${id}/records${qs ? `?${qs}` : ""}`;
  };
  const currentUrl = buildUrl(selectedStudent?.id, category);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="records"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="기록 카드"
        themeColor={classroom.theme_color}
      />
      <p className="-mt-3 text-sm text-ink-soft">
        🔒 이 기록은 선생님만 볼 수 있어요. 학생·학부모 화면 어디에도 나타나지
        않습니다.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildUrl(undefined, category)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !selectedStudent
              ? "bg-ink text-paper"
              : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
          }`}
        >
          전체
        </Link>
        {(students ?? []).map((s) => (
          <Link
            key={s.id}
            href={buildUrl(s.id, category)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedStudent?.id === s.id
                ? "bg-ink text-paper"
                : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
            }`}
          >
            {s.number} {s.nickname}
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">기록 남기기</h2>
        <form action={addRecord} className="flex flex-col gap-3">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <input type="hidden" name="back" value={currentUrl} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              학생
              <select
                name="student_id"
                required
                defaultValue={selectedStudent?.id ?? ""}
                className="rounded-lg border border-line bg-paper-soft p-2 text-ink"
              >
                <option value="" disabled>
                  선택
                </option>
                {(students ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number}번 {s.nickname}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              날짜
              <input
                type="date"
                name="record_date"
                required
                defaultValue={todayString()}
                className="rounded-lg border border-line bg-paper-soft p-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              유형
              <select name="category" defaultValue="상담" className="rounded-lg border border-line bg-paper-soft p-2 text-ink">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            name="content"
            required
            rows={3}
            placeholder="기록 내용 (이 화면에서만 보입니다)"
            className="rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink placeholder:text-ink-faint"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            기록 저장
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold tracking-wide text-ink-faint">
            {selectedStudent
              ? `${selectedStudent.number}번 ${selectedStudent.nickname}의 기록`
              : "전체 기록"}{" "}
            {records?.length ?? 0}건
          </h2>
          <div className="flex gap-1">
            <Link
              href={buildUrl(selectedStudent?.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                !category ? "bg-ink text-paper" : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
              }`}
            >
              전체
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                href={buildUrl(selectedStudent?.id, c)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  category === c
                    ? `${CATEGORY_STYLE[c]} ring-1 ring-line-strong`
                    : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        {records && records.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {records.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 rounded-xl border border-line bg-paper p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[r.category]}`}>
                    {r.category}
                  </span>
                  {!selectedStudent && (
                    <span className="font-semibold text-ink">
                      {studentName.get(r.student_id) ?? "(삭제된 학생)"}
                    </span>
                  )}
                  <span className="text-ink-faint tabular-nums">
                    {formatKoreanDate(r.record_date)}
                  </span>
                  <form action={deleteRecord} className="ml-auto">
                    <input type="hidden" name="classroom_id" value={classroom.id} />
                    <input type="hidden" name="record_id" value={r.id} />
                    <input type="hidden" name="back" value={currentUrl} />
                    <button
                      type="submit"
                      title="삭제"
                      className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      ×
                    </button>
                  </form>
                </div>
                <p className="text-sm whitespace-pre-wrap text-ink">{r.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center font-hand text-base text-ink-soft">
            아직 기록이 없어요.
          </p>
        )}
      </section>
    </main>
  );
}
