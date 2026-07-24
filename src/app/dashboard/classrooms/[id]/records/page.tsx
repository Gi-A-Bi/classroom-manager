import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKoreanDate, todayString } from "@/lib/dates";
import { BUILTIN_TYPES, typeChip, typeLabel } from "@/lib/record-types";
import { createClient } from "@/lib/supabase/server";
import { RecordEditor } from "./RecordEditor";
import {
  addRecord,
  addRecordType,
  deleteRecord,
  deleteRecordType,
} from "./actions";

export default async function StudentRecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    student?: string;
    type?: string;
    tag?: string;
  }>;
}) {
  const { id } = await params;
  const {
    error,
    student: studentParam,
    type: typeParam,
    tag: tagParam,
  } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: students }, { data: customTypes }] =
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
      supabase.from("record_types").select("id, label").order("sort_order"),
    ]);

  if (!classroom) notFound();

  const selectedStudent = (students ?? []).find((s) => s.id === studentParam);

  // 유형 필터 옵션 = 내장 + 커스텀
  const typeFilters = [
    ...BUILTIN_TYPES.map((t) => ({ key: t.key, label: t.label })),
    ...(customTypes ?? []).map((c) => ({ key: "custom", label: c.label })),
  ];

  let query = supabase
    .from("student_records")
    .select("id, student_id, record_date, record_type, detail, content, tags, peer_student_id, link_group")
    .eq("classroom_id", id)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (selectedStudent) query = query.eq("student_id", selectedStudent.id);
  if (typeParam) query = query.eq("record_type", typeParam);
  if (tagParam) query = query.contains("tags", [tagParam]);
  const { data: records } = await query;

  const studentName = new Map(
    (students ?? []).map((s) => [s.id, `${s.number}번 ${s.nickname}`]),
  );
  const existingTags = [
    ...new Set((records ?? []).flatMap((r) => r.tags ?? [])),
  ].sort();

  const buildUrl = (o: { student?: string; type?: string; tag?: string }) => {
    const p = new URLSearchParams();
    if (o.student) p.set("student", o.student);
    if (o.type) p.set("type", o.type);
    if (o.tag) p.set("tag", o.tag);
    const qs = p.toString();
    return `/dashboard/classrooms/${id}/records${qs ? `?${qs}` : ""}`;
  };
  const currentUrl = buildUrl({
    student: selectedStudent?.id,
    type: typeParam,
    tag: tagParam,
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav
        classroomId={classroom.id}
        current="records"
        themeColor={classroom.theme_color}
      />

      <ClassroomHeader
        name={classroom.name}
        title="기록 카드"
        themeColor={classroom.theme_color}
      />
      <p className="-mt-3 text-sm text-ink-soft">
        🔒 이 기록은 선생님만 볼 수 있어요. 학생·학부모 화면 어디에도 나타나지
        않습니다. 오른쪽 아래{" "}
        <span className="font-medium text-ink">빠른 기록</span> 버튼으로 3초 만에
        남길 수 있어요.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 학생 필터 */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildUrl({ type: typeParam, tag: tagParam })}
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
            href={buildUrl({ student: s.id, type: typeParam, tag: tagParam })}
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

      {/* 유형 필터 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold tracking-wide text-ink-faint">유형</span>
        <Link
          href={buildUrl({ student: selectedStudent?.id, tag: tagParam })}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            !typeParam
              ? "bg-ink text-paper"
              : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
          }`}
        >
          전체
        </Link>
        {typeFilters.map((t) => (
          <Link
            key={t.key + t.label}
            href={buildUrl({
              student: selectedStudent?.id,
              type: t.key,
              tag: tagParam,
            })}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              typeParam === t.key
                ? `${typeChip(t.key)} ring-1 ring-line-strong`
                : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tagParam && (
        <p className="text-sm text-ink-soft">
          <span className="rounded-full bg-paper-soft px-2 py-0.5 font-medium text-ink">
            #{tagParam}
          </span>{" "}
          태그로 필터 중 ·{" "}
          <Link
            href={buildUrl({ student: selectedStudent?.id, type: typeParam })}
            className="underline hover:text-ink"
          >
            해제
          </Link>
        </p>
      )}

      {/* 수동 기록(긴 메모) */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">기록 남기기 (긴 메모)</h2>
        <p className="text-sm text-ink-soft">
          짧은 기록은 빠른 기록 버튼이 빠릅니다. 상담 내용처럼 길게 남길 때 이곳을
          쓰세요.
        </p>
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
              <select
                name="record_type"
                defaultValue="observation"
                className="rounded-lg border border-line bg-paper-soft p-2 text-ink"
              >
                {BUILTIN_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
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
          <input
            type="text"
            name="tags"
            placeholder="태그 (선택) — 예: #발표 #리더십"
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

      {/* 목록 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-wide text-ink-faint">
          {selectedStudent
            ? `${selectedStudent.number}번 ${selectedStudent.nickname}의 기록`
            : "전체 기록"}{" "}
          {records?.length ?? 0}건
        </h2>

        {records && records.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-paper p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeChip(r.record_type)}`}
                  >
                    {typeLabel(r.record_type, r.detail)}
                    {r.record_type !== "custom" && r.detail
                      ? ` · ${r.detail}`
                      : ""}
                  </span>
                  {!selectedStudent && (
                    <Link
                      href={`/dashboard/classrooms/${id}/students/${r.student_id}`}
                      className="font-semibold text-ink underline decoration-line decoration-1 underline-offset-2 hover:decoration-ink-soft"
                    >
                      {studentName.get(r.student_id) ?? "(삭제된 학생)"}
                    </Link>
                  )}
                  {r.peer_student_id && (
                    <Link
                      href={`/dashboard/classrooms/${id}/students/${r.peer_student_id}`}
                      className="text-xs text-red-600 hover:underline"
                    >
                      ↔ {studentName.get(r.peer_student_id) ?? "상대"}
                    </Link>
                  )}
                  <span className="tabular-nums text-ink-faint">
                    {formatKoreanDate(r.record_date)}
                  </span>
                  <form action={deleteRecord} className="ml-auto">
                    <input
                      type="hidden"
                      name="classroom_id"
                      value={classroom.id}
                    />
                    <input type="hidden" name="record_id" value={r.id} />
                    <input type="hidden" name="back" value={currentUrl} />
                    <button
                      type="submit"
                      title={r.link_group ? "양쪽 기록 함께 삭제" : "삭제"}
                      className="rounded-md px-2 py-1 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      ×
                    </button>
                  </form>
                </div>
                <RecordEditor
                  classroomId={classroom.id}
                  recordId={r.id}
                  back={currentUrl}
                  content={r.content}
                  tags={r.tags ?? []}
                  recordDate={r.record_date}
                  tagLinks={(r.tags ?? []).map((t: string) => ({
                    tag: t,
                    href: buildUrl({
                      student: selectedStudent?.id,
                      type: typeParam,
                      tag: t,
                    }),
                  }))}
                  existingTags={existingTags}
                  isLinked={!!r.link_group}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-8 text-center font-hand text-base text-ink-soft">
            아직 기록이 없어요.
          </p>
        )}
      </section>

      {/* 커스텀 유형 관리 */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper/60 p-5">
        <h2 className="text-sm font-semibold text-ink">유형 추가</h2>
        <p className="text-xs text-ink-soft">
          기본 유형(칭찬·숙제 미제출·준비물·갈등·건강·기타 관찰) 외에 자주 쓰는
          유형을 직접 추가할 수 있어요. 빠른 기록 버튼에도 함께 나타납니다.
        </p>
        <form action={addRecordType} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <input
            type="text"
            name="label"
            required
            maxLength={20}
            placeholder="예: 지각, 독서"
            className="rounded-lg border border-line bg-paper-soft p-2 text-sm text-ink placeholder:text-ink-faint"
          />
          <button
            type="submit"
            className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            추가
          </button>
        </form>
        {customTypes && customTypes.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {customTypes.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1 rounded-full bg-purple-100 py-1 pl-3 pr-1 text-sm text-purple-700"
              >
                {c.label}
                <form action={deleteRecordType}>
                  <input
                    type="hidden"
                    name="classroom_id"
                    value={classroom.id}
                  />
                  <input type="hidden" name="type_id" value={c.id} />
                  <ConfirmSubmit
                    question={`'${c.label}' 유형을 삭제할까요? (기존 기록은 남습니다)`}
                    confirmLabel="삭제"
                    className="rounded-full px-1.5 text-purple-400 hover:text-purple-700"
                  >
                    ×
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
