import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassroomNav } from "@/components/ClassroomNav";
import { StudentTimeline, type TimelineItem } from "@/components/StudentTimeline";
import { getTheme } from "@/lib/themes";
import { typeChip, typeLabel } from "@/lib/record-types";
import { createClient } from "@/lib/supabase/server";

const PERIODS = [
  { key: "month", label: "이번 달" },
  { key: "term", label: "이번 학기" },
  { key: "all", label: "전체" },
] as const;

const ATT = {
  absent: { label: "결석", chip: "bg-red-100 text-red-700" },
  late: { label: "지각", chip: "bg-amber-100 text-amber-800" },
  early: { label: "조퇴", chip: "bg-orange-100 text-orange-800" },
  result: { label: "결과", chip: "bg-slate-100 text-slate-700" },
} as const;

function periodStart(period: string, today: string): string | null {
  if (period === "all") return null;
  const d = new Date(today + "T00:00:00");
  if (period === "term") {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (m >= 3 && m <= 8) return `${y}-03-01`;
    if (m >= 9) return `${y}-09-01`;
    return `${y - 1}-09-01`;
  }
  return `${today.slice(0, 7)}-01`; // month
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; studentId: string }>;
  searchParams: Promise<{
    period?: string;
    kind?: string;
    subject?: string;
    tag?: string;
  }>;
}) {
  const { id, studentId } = await params;
  const sp = await searchParams;
  const period = PERIODS.some((p) => p.key === sp.period) ? sp.period! : "term";
  const kind = ["grade", "attendance", "record"].includes(sp.kind ?? "")
    ? sp.kind!
    : "all";
  const subjectFilter = sp.subject ?? "";
  const tagFilter = sp.tag ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const since = periodStart(period, today);

  // RLS가 담임 교사 전용을 강제 — 남의 학급/학생은 아예 조회 안 됨
  const [
    { data: classroom },
    { data: students },
    { data: attendance },
    { data: subjects },
    { data: assessments },
    { data: results },
    { data: records },
  ] = await Promise.all([
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
      .select("record_date, type, reason, memo")
      .eq("classroom_id", id)
      .eq("student_id", studentId),
    supabase.from("subjects").select("id, name").eq("classroom_id", id),
    supabase
      .from("assessments")
      .select("id, title, assess_date, kind, max_score, subject_id")
      .eq("classroom_id", id),
    supabase
      .from("assessment_results")
      .select("assessment_id, value")
      .eq("classroom_id", id)
      .eq("student_id", studentId),
    supabase
      .from("student_records")
      .select("id, record_date, record_type, detail, content, tags, peer_student_id, created_at")
      .eq("classroom_id", id)
      .eq("student_id", studentId),
  ]);

  if (!classroom) notFound();
  const student = (students ?? []).find((s) => s.id === studentId);
  if (!student) notFound();

  const theme = getTheme(classroom.theme_color);
  const nameOf = new Map(
    (students ?? []).map((s) => [s.id, `${s.number}번 ${s.nickname}`]),
  );
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const assessmentById = new Map((assessments ?? []).map((a) => [a.id, a]));

  const inPeriod = (dateStr: string) => !since || dateStr >= since;

  // ---------- 요약 집계 (기간 반영) ----------
  // 출결
  const att = (attendance ?? []).filter((a) => inPeriod(a.record_date));
  const absentByReason = new Map<string, number>();
  let lateN = 0,
    earlyN = 0,
    resultN = 0,
    fieldTripDays = 0;
  for (const a of att) {
    if (a.type === "absent") {
      absentByReason.set(a.reason, (absentByReason.get(a.reason) ?? 0) + 1);
      if (a.reason === "체험학습") fieldTripDays += 1;
    } else if (a.type === "late") lateN += 1;
    else if (a.type === "early") earlyN += 1;
    else if (a.type === "result") resultN += 1;
  }
  const absentTotal = [...absentByReason.values()].reduce((s, n) => s + n, 0);

  // 성적: 과목별 점수 평균 / 단계 최빈
  type SubjAgg = { scores: number[]; levels: string[] };
  const bySubject = new Map<string, SubjAgg>();
  const gradeItems: TimelineItem[] = [];
  for (const r of results ?? []) {
    const a = assessmentById.get(r.assessment_id);
    if (!a || !inPeriod(a.assess_date)) continue;
    const subj = subjectName.get(a.subject_id) ?? "기타";
    const agg = bySubject.get(subj) ?? { scores: [], levels: [] };
    if (a.kind === "score") {
      const n = Number(r.value);
      if (!Number.isNaN(n)) agg.scores.push(n);
    } else {
      agg.levels.push(r.value);
    }
    bySubject.set(subj, agg);
  }
  const gradeSummary = [...bySubject.entries()].map(([subj, agg]) => {
    const avg =
      agg.scores.length > 0
        ? Math.round(
            (agg.scores.reduce((s, n) => s + n, 0) / agg.scores.length) * 10,
          ) / 10
        : null;
    let mode: string | null = null;
    if (agg.levels.length > 0) {
      const freq = new Map<string, number>();
      for (const v of agg.levels) freq.set(v, (freq.get(v) ?? 0) + 1);
      mode = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    return { subject: subj, avg, count: agg.scores.length, mode };
  });

  // 기록: 유형별 횟수
  const recsPeriod = (records ?? []).filter((r) => inPeriod(r.record_date));
  const recCount = new Map<string, { label: string; type: string; count: number }>();
  for (const r of recsPeriod) {
    const key = r.record_type === "custom" ? `custom:${r.detail ?? ""}` : r.record_type;
    const cur = recCount.get(key) ?? {
      label: typeLabel(r.record_type, r.detail),
      type: r.record_type,
      count: 0,
    };
    cur.count += 1;
    recCount.set(key, cur);
  }
  const recSummary = [...recCount.values()].sort((a, b) => b.count - a.count);

  // ---------- 타임라인 항목 만들기 ----------
  const items: TimelineItem[] = [];
  // 성적
  for (const r of results ?? []) {
    const a = assessmentById.get(r.assessment_id);
    if (!a) continue;
    const subj = subjectName.get(a.subject_id) ?? "기타";
    const valueText =
      a.kind === "score"
        ? `${r.value}점${a.max_score ? ` / ${a.max_score}` : ""}`
        : r.value;
    items.push({
      id: `g-${r.assessment_id}`,
      date: a.assess_date,
      kind: "grade",
      chip: "bg-sky-100 text-sky-800",
      badge: "성적",
      title: `${subj} · ${a.title}`,
      value: valueText,
      subject: subj,
    });
  }
  // 출결
  for (const a of attendance ?? []) {
    const meta = ATT[a.type as keyof typeof ATT];
    const isField = a.type === "absent" && a.reason === "체험학습";
    items.push({
      id: `a-${a.record_date}`,
      date: a.record_date,
      kind: "attendance",
      chip: isField ? "bg-teal-100 text-teal-800" : meta.chip,
      badge: "출결",
      title: isField ? "체험학습" : `${meta.label} (${a.reason})`,
      detail: a.memo || null,
    });
  }
  // 기록
  for (const r of records ?? []) {
    items.push({
      id: `r-${r.id}`,
      date: r.record_date,
      kind: "record",
      chip: typeChip(r.record_type),
      badge: "기록",
      title:
        typeLabel(r.record_type, r.detail) +
        (r.record_type !== "custom" && r.detail ? ` · ${r.detail}` : ""),
      detail: r.content || null,
      tags: r.tags ?? [],
      recordType: r.record_type,
      peerId: r.peer_student_id,
      peerName: r.peer_student_id ? nameOf.get(r.peer_student_id) ?? "상대" : null,
      subject:
        r.record_type === "homework" && r.detail ? r.detail : undefined,
    });
  }

  // 기간 + 유형/과목/태그 필터 → 시간순(오래된 → 최근) 정렬
  const timeline = items
    .filter((it) => inPeriod(it.date))
    .filter((it) => kind === "all" || it.kind === kind)
    .filter((it) => !subjectFilter || it.subject === subjectFilter)
    .filter((it) => !tagFilter || (it.tags ?? []).includes(tagFilter))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // 필터 옵션
  const subjectOptions = [...new Set(items.filter((i) => i.subject).map((i) => i.subject!))].sort();
  const tagOptions = [
    ...new Set((records ?? []).flatMap((r) => r.tags ?? [])),
  ].sort();

  // ---------- 이전/다음 학생 (번호순) ----------
  const idx = (students ?? []).findIndex((s) => s.id === studentId);
  const prev = idx > 0 ? students![idx - 1] : null;
  const next =
    idx >= 0 && idx < (students?.length ?? 0) - 1 ? students![idx + 1] : null;

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { period, kind, subject: subjectFilter, tag: tagFilter, ...extra };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === "period" && v === "term") && !(k === "kind" && v === "all"))
        p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const base = `/dashboard/classrooms/${id}/students`;
  const detailUrl = (sid: string) => `${base}/${sid}${qs({})}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <ClassroomNav classroomId={id} current="students" themeColor={classroom.theme_color} />

      {/* 상단: 뒤로 + 이전/다음 학생 */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`${base}`}
          className="inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeft size={15} strokeWidth={2} aria-hidden />
          명렬로
        </Link>
        <div className="flex items-center gap-1.5">
          {prev ? (
            <Link
              href={detailUrl(prev.id)}
              className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
            >
              <ChevronLeft size={14} aria-hidden /> {prev.number}번
            </Link>
          ) : (
            <span className="rounded-lg border border-line/50 px-2.5 py-1.5 text-xs text-ink-faint">
              처음
            </span>
          )}
          {next ? (
            <Link
              href={detailUrl(next.id)}
              className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-soft"
            >
              {next.number}번 <ChevronRight size={14} aria-hidden />
            </Link>
          ) : (
            <span className="rounded-lg border border-line/50 px-2.5 py-1.5 text-xs text-ink-faint">
              마지막
            </span>
          )}
        </div>
      </div>

      {/* 요약 카드 */}
      <section className="overflow-hidden rounded-2xl border border-line bg-paper">
        <div className={`h-1.5 w-full ${theme.topbar}`} aria-hidden />
        <div className="p-5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl text-ink">{student.nickname}</span>
          <span className="text-sm text-ink-soft">{student.number}번</span>
        </div>
        <p className="mt-0.5 text-xs text-ink-faint">
          🔒 이 화면은 선생님만 볼 수 있어요. 학생·학부모 화면에는 나타나지 않습니다.
        </p>

        {/* 기간 필터 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`${base}/${studentId}${qs({ period: p.key })}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                period === p.key
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {/* 출결 */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold tracking-wide text-ink-faint">출결</h3>
            {absentTotal + lateN + earlyN + resultN === 0 ? (
              <p className="text-sm text-ink-soft">특이사항 없음</p>
            ) : (
              <ul className="flex flex-col gap-0.5 text-sm text-ink">
                {absentTotal > 0 && (
                  <li>
                    결석 {absentTotal}
                    <span className="text-ink-faint">
                      {" ("}
                      {[...absentByReason.entries()]
                        .map(([r, n]) => `${r} ${n}`)
                        .join(", ")}
                      {")"}
                    </span>
                  </li>
                )}
                {lateN > 0 && <li>지각 {lateN}</li>}
                {earlyN > 0 && <li>조퇴 {earlyN}</li>}
                {resultN > 0 && <li>결과 {resultN}</li>}
                {fieldTripDays > 0 && (
                  <li className="text-teal-700">체험학습 누적 {fieldTripDays}일</li>
                )}
              </ul>
            )}
          </div>

          {/* 성적 */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold tracking-wide text-ink-faint">성적</h3>
            {gradeSummary.length === 0 ? (
              <p className="text-sm text-ink-soft">기록 없음</p>
            ) : (
              <ul className="flex flex-col gap-0.5 text-sm text-ink">
                {gradeSummary.map((g) => (
                  <li key={g.subject}>
                    <span className="font-medium">{g.subject}</span>{" "}
                    {g.avg !== null && (
                      <span>
                        평균 {g.avg}점
                        <span className="text-ink-faint"> ({g.count}회)</span>
                      </span>
                    )}
                    {g.avg !== null && g.mode && " · "}
                    {g.mode && <span>최빈 ‘{g.mode}’</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 기록 */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold tracking-wide text-ink-faint">기록</h3>
            {recSummary.length === 0 ? (
              <p className="text-sm text-ink-soft">기록 없음</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {recSummary.map((c) => (
                  <span
                    key={c.label}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeChip(c.type)}`}
                  >
                    {c.label} {c.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </section>

      {/* 타임라인 필터 */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold tracking-wide text-ink-faint">유형</span>
          {[
            { key: "all", label: "전체" },
            { key: "grade", label: "성적" },
            { key: "attendance", label: "출결" },
            { key: "record", label: "기록" },
          ].map((k) => (
            <Link
              key={k.key}
              href={`${base}/${studentId}${qs({ kind: k.key })}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                kind === k.key
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
              }`}
            >
              {k.label}
            </Link>
          ))}
        </div>
        {subjectOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold tracking-wide text-ink-faint">과목</span>
            <Link
              href={`${base}/${studentId}${qs({ subject: undefined })}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                !subjectFilter
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
              }`}
            >
              전체
            </Link>
            {subjectOptions.map((s) => (
              <Link
                key={s}
                href={`${base}/${studentId}${qs({ subject: s })}`}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  subjectFilter === s
                    ? "bg-ink text-paper"
                    : "border border-line bg-paper text-ink-soft hover:bg-paper-soft"
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        )}
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold tracking-wide text-ink-faint">태그</span>
            {tagFilter && (
              <Link
                href={`${base}/${studentId}${qs({ tag: undefined })}`}
                className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-paper"
              >
                #{tagFilter} ✕
              </Link>
            )}
            {tagOptions
              .filter((t) => t !== tagFilter)
              .map((t) => (
                <Link
                  key={t}
                  href={`${base}/${studentId}${qs({ tag: t })}`}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-paper-soft"
                >
                  #{t}
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* 타임라인 */}
      <StudentTimeline
        items={timeline}
        peerHref={(sid) => `${base}/${sid}${qs({})}`}
        emptyLabel={
          period === "all"
            ? "아직 이 학생의 기록이 없어요."
            : "이 기간에는 기록이 없어요."
        }
      />
    </main>
  );
}
