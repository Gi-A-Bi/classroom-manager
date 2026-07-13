import { NextResponse, type NextRequest } from "next/server";
import { formatMonthDay } from "@/lib/dates";
import { typeLabel } from "@/lib/record-types";
import {
  classifyGroup,
  compressLine,
  currentSemester,
  REPORT_GROUPS,
  REPORT_PERIODS,
  reportWindow,
} from "@/lib/report";
import { createClient } from "@/lib/supabase/server";

const ATT_LABEL: Record<string, string> = {
  absent: "결석",
  late: "지각",
  early: "조퇴",
  result: "결과",
};

type Item = {
  date: string;
  kind: "grade" | "attendance" | "record";
  title: string;
  value?: string;
  detail?: string | null;
  tags?: string[];
  recordType?: string;
  recordDetail?: string | null;
  peerName?: string | null;
};

// 반 전체를 학생별로 정리한 생기부 참고 자료 내보내기(텍스트/CSV).
// RLS 클라이언트로만 조회 → 담임이 아니면 데이터가 비어 나온다.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "txt";
  const rpParam = request.nextUrl.searchParams.get("rp") ?? "";
  const rp = REPORT_PERIODS.some((p) => p.key === rpParam)
    ? rpParam
    : currentSemester(today);
  const { since, endExcl, label } = reportWindow(rp, today);
  const inWin = (d: string) => d >= since && d < endExcl;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const [
    { data: classroom },
    { data: students },
    { data: subjects },
    { data: assessments },
    { data: results },
    { data: attendance },
    { data: records },
  ] = await Promise.all([
    supabase.from("classrooms").select("id, name").eq("id", id).single(),
    supabase
      .from("students")
      .select("id, number, nickname")
      .eq("classroom_id", id)
      .order("number"),
    supabase.from("subjects").select("id, name").eq("classroom_id", id),
    supabase
      .from("assessments")
      .select("id, title, assess_date, kind, max_score, subject_id")
      .eq("classroom_id", id),
    supabase
      .from("assessment_results")
      .select("assessment_id, student_id, value")
      .eq("classroom_id", id),
    supabase
      .from("attendance_records")
      .select("student_id, record_date, type, reason, memo")
      .eq("classroom_id", id),
    supabase
      .from("student_records")
      .select("student_id, record_date, record_type, detail, content, tags, peer_student_id")
      .eq("classroom_id", id),
  ]);

  if (!classroom) return new NextResponse("학급을 찾을 수 없습니다.", { status: 404 });

  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const assessmentById = new Map((assessments ?? []).map((a) => [a.id, a]));
  const nameOf = new Map(
    (students ?? []).map((s) => [s.id, `${s.number}번 ${s.nickname}`]),
  );

  function itemsFor(sid: string): Item[] {
    const out: Item[] = [];
    for (const r of results ?? []) {
      if (r.student_id !== sid) continue;
      const a = assessmentById.get(r.assessment_id);
      if (!a || !inWin(a.assess_date)) continue;
      const subj = subjectName.get(a.subject_id) ?? "기타";
      out.push({
        date: a.assess_date,
        kind: "grade",
        title: `${subj} · ${a.title}`,
        value:
          a.kind === "score"
            ? `${r.value}점${a.max_score ? ` / ${a.max_score}` : ""}`
            : r.value,
      });
    }
    for (const a of attendance ?? []) {
      if (a.student_id !== sid || !inWin(a.record_date)) continue;
      const isField = a.type === "absent" && a.reason === "체험학습";
      out.push({
        date: a.record_date,
        kind: "attendance",
        title: isField ? "체험학습" : `${ATT_LABEL[a.type]} (${a.reason})`,
        detail: a.memo || null,
      });
    }
    for (const r of records ?? []) {
      if (r.student_id !== sid || !inWin(r.record_date)) continue;
      out.push({
        date: r.record_date,
        kind: "record",
        title:
          typeLabel(r.record_type, r.detail) +
          (r.record_type !== "custom" && r.detail ? ` · ${r.detail}` : ""),
        detail: r.content || null,
        tags: r.tags ?? [],
        recordType: r.record_type,
        recordDetail: r.detail,
        peerName: r.peer_student_id
          ? nameOf.get(r.peer_student_id) ?? "상대"
          : null,
      });
    }
    return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  }

  const groupsFor = (its: Item[]) =>
    REPORT_GROUPS.map((g) => ({
      ...g,
      items: its.filter(
        (it) =>
          classifyGroup({
            kind: it.kind,
            recordType: it.recordType,
            recordDetail: it.recordDetail,
            tags: it.tags,
          }) === g.key,
      ),
    })).filter((g) => g.items.length > 0);

  let body: string;
  let mime: string;
  let ext: string;

  if (format === "csv") {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [["번호", "이름", "주제", "날짜", "내용"].map(esc).join(",")];
    for (const s of students ?? []) {
      for (const g of groupsFor(itemsFor(s.id))) {
        for (const it of g.items) {
          rows.push(
            [
              String(s.number),
              esc(s.nickname),
              esc(g.label),
              it.date,
              esc(compressLine(it, false)),
            ].join(","),
          );
        }
      }
    }
    body = "﻿" + rows.join("\r\n"); // BOM(엑셀 한글)
    mime = "text/csv; charset=utf-8";
    ext = "csv";
  } else {
    const blocks: string[] = [];
    for (const s of students ?? []) {
      const groups = groupsFor(itemsFor(s.id));
      const lines = [`${s.number}번 ${s.nickname}`];
      if (groups.length === 0) lines.push("  (기록 없음)");
      for (const g of groups) {
        lines.push(`[${g.label}]`);
        for (const it of g.items)
          lines.push(`- ${formatMonthDay(it.date)} ${compressLine(it, false)}`);
      }
      blocks.push(lines.join("\n"));
    }
    body =
      `${classroom.name} · ${label} · 생기부 참고 자료\n` +
      `${"=".repeat(28)}\n\n` +
      blocks.join("\n\n" + "-".repeat(28) + "\n\n");
    mime = "text/plain; charset=utf-8";
    ext = "txt";
  }

  const filename = `생기부참고_${classroom.name}_${label}.${ext}`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
