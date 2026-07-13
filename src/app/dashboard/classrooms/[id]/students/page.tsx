import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomHeader } from "@/components/ClassroomHeader";
import { ClassroomNav } from "@/components/ClassroomNav";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { todayString } from "@/lib/dates";
import { typeChip, typeLabel } from "@/lib/record-types";
import { createClient } from "@/lib/supabase/server";
import { addStudentsBulk, resetAllPins, resetStudentPin } from "./actions";

const RANGES = [
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" },
  { key: "term", label: "학기" },
] as const;

// 기간 시작일(YYYY-MM-DD)
function rangeStart(range: string, today: string): string {
  const d = new Date(today + "T00:00:00");
  if (range === "week") {
    const mon = d.getDay() === 0 ? 6 : d.getDay() - 1; // 월=0
    d.setDate(d.getDate() - mon);
    return d.toISOString().slice(0, 10);
  }
  if (range === "term") {
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1-12
    if (m >= 3 && m <= 8) return `${y}-03-01`; // 1학기
    if (m >= 9) return `${y}-09-01`; // 2학기
    return `${y - 1}-09-01`; // 1~2월: 지난 2학기 이어짐
  }
  // month
  return `${today.slice(0, 7)}-01`;
}

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string; range?: string }>;
}) {
  const { id } = await params;
  const { error, success, range: rangeParam } = await searchParams;
  const range = RANGES.some((r) => r.key === rangeParam) ? rangeParam! : "month";
  const today = todayString();
  const since = rangeStart(range, today);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classroom }, { data: students }, { data: recs }] =
    await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name, class_code, theme_color")
        .eq("id", id)
        .single(),
      supabase
        .from("students")
        .select("id, number, nickname, pin_is_initial")
        .eq("classroom_id", id)
        .order("number"),
      supabase
        .from("student_records")
        .select("student_id, record_type, detail")
        .eq("classroom_id", id)
        .gte("record_date", since),
    ]);

  // RLS 때문에 남의 학급은 조회 자체가 안 된다
  if (!classroom) notFound();

  // 학생별 유형 집계 — key = 커스텀이면 라벨, 아니면 record_type
  const summary = new Map<string, Map<string, { label: string; type: string; count: number }>>();
  for (const r of recs ?? []) {
    const key = r.record_type === "custom" ? `custom:${r.detail ?? ""}` : r.record_type;
    const label = typeLabel(r.record_type, r.detail);
    const byType = summary.get(r.student_id) ?? new Map();
    const cur = byType.get(key) ?? { label, type: r.record_type, count: 0 };
    cur.count += 1;
    byType.set(key, cur);
    summary.set(r.student_id, byType);
  }
  const buildUrl = (rk: string) =>
    `/dashboard/classrooms/${id}/students?range=${rk}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={classroom.id} current="students"
        themeColor={classroom.theme_color} />

      <ClassroomHeader
        name={classroom.name}
        title="학생 명렬"
        classCode={classroom.class_code}
        themeColor={classroom.theme_color}
      />
      <p className="-mt-2 text-sm text-ink-soft">
        학생들은 학급코드와 출석번호, PIN으로 접속합니다.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-ink">명렬 일괄 등록</h2>
        <p className="text-sm text-ink-soft">
          한 줄에 한 명씩 「번호 이름」 형식으로 붙여넣어 주세요. 이름 대신
          별명을 써도 됩니다.
        </p>
        <form action={addStudentsBulk} className="flex flex-col gap-3">
          <input type="hidden" name="classroom_id" value={classroom.id} />
          <textarea
            name="roster"
            required
            rows={8}
            placeholder={"1 김하늘\n2 이바다\n3 박구름"}
            className="rounded-lg border border-line bg-paper-soft p-2 font-mono text-sm text-ink placeholder:text-ink-faint"
          />
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            초기 PIN (숫자 4자리, 전체 공통)
            <input
              type="text"
              name="pin"
              required
              pattern="\d{4}"
              maxLength={4}
              defaultValue="0000"
              className="w-20 rounded-lg border border-line bg-paper-soft p-2 text-center font-mono text-ink"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            일괄 등록
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">
            등록된 학생{" "}
            <span className="tabular-nums text-ink-soft">
              {students?.length ?? 0}
            </span>
            명
          </h2>
          {students && students.length > 0 && (
            <div className="flex items-center gap-2">
              {(() => {
                const initialN = students.filter((s) => s.pin_is_initial).length;
                const setN = students.length - initialN;
                return (
                  <span className="text-xs text-ink-soft">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                      초기 PIN {initialN}
                    </span>{" "}
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                      설정됨 {setN}
                    </span>
                  </span>
                );
              })()}
              <form action={resetAllPins}>
                <input type="hidden" name="classroom_id" value={classroom.id} />
                <ConfirmSubmit
                  question="전체 학생 PIN을 0000으로 되돌릴까요?"
                  confirmLabel="전체 초기화"
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
                >
                  전체 PIN 초기화
                </ConfirmSubmit>
              </form>
            </div>
          )}
        </div>
        {/* 기간별 기록 요약 필터 */}
        {students && students.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold tracking-wide text-ink-faint">
              기록 요약
            </span>
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={buildUrl(r.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === r.key
                    ? "bg-ink text-paper"
                    : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        )}
        {students && students.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {students.map((s) => {
              const byType = summary.get(s.id);
              const chips = byType
                ? [...byType.values()].sort((a, b) => b.count - a.count)
                : [];
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl border border-line bg-paper p-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink">
                      <span className="mr-2 font-mono text-ink-faint">
                        {s.number}번
                      </span>
                      {s.nickname}
                      <span
                        className={`ml-3 rounded-full px-2 py-0.5 text-xs ${
                          s.pin_is_initial
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {s.pin_is_initial ? "초기 PIN(0000)" : "PIN 설정됨"}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/dashboard/classrooms/${classroom.id}/records?student=${s.id}`}
                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
                      >
                        기록 보기
                      </Link>
                      <form action={resetStudentPin}>
                        <input type="hidden" name="student_id" value={s.id} />
                        <input
                          type="hidden"
                          name="classroom_id"
                          value={classroom.id}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
                        >
                          PIN 초기화
                        </button>
                      </form>
                    </div>
                  </div>
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chips.map((c) => (
                        <span
                          key={c.label}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeChip(c.type)}`}
                        >
                          {c.label} {c.count}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="font-hand text-base text-ink-soft">
            아직 등록된 학생이 없습니다.
          </p>
        )}
      </section>
    </main>
  );
}
