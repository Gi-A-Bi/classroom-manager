import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 성적 CSV 다운로드 — ?subject=<id> 지정 시 해당 과목만, 없으면 학급 전체.
// RLS 적용 클라이언트로 조회하므로 담임이 아니면 아무 데이터도 나오지 않는다.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const subjectId = request.nextUrl.searchParams.get("subject");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const [{ data: classroom }, { data: students }, { data: subjects }] =
    await Promise.all([
      supabase.from("classrooms").select("id, name").eq("id", id).single(),
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
    ]);

  if (!classroom) {
    return new NextResponse("학급을 찾을 수 없습니다.", { status: 404 });
  }

  let assessmentQuery = supabase
    .from("assessments")
    .select("id, subject_id, title, assess_date, kind, max_score")
    .eq("classroom_id", id)
    .order("assess_date");
  if (subjectId) assessmentQuery = assessmentQuery.eq("subject_id", subjectId);
  const { data: assessments } = await assessmentQuery;

  const assessmentIds = (assessments ?? []).map((a) => a.id);
  const { data: results } =
    assessmentIds.length > 0
      ? await supabase
          .from("assessment_results")
          .select("assessment_id, student_id, value")
          .in("assessment_id", assessmentIds)
      : { data: [] };

  const valueOf = new Map(
    (results ?? []).map((r) => [`${r.assessment_id}:${r.student_id}`, r.value]),
  );
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  // 과목 순서 → 날짜 순으로 열 정렬
  const subjectOrder = new Map((subjects ?? []).map((s, i) => [s.id, i]));
  const columns = [...(assessments ?? [])].sort(
    (a, b) =>
      (subjectOrder.get(a.subject_id) ?? 0) - (subjectOrder.get(b.subject_id) ?? 0) ||
      a.assess_date.localeCompare(b.assess_date),
  );

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = [
    "번호",
    "이름",
    ...columns.map((a) => {
      const max =
        a.kind === "score" && a.max_score !== null ? ` (만점 ${Number(a.max_score)})` : "";
      return esc(`${subjectName.get(a.subject_id)} | ${a.title}${max} | ${a.assess_date}`);
    }),
  ].join(",");

  const rows = (students ?? []).map((s) =>
    [
      s.number,
      esc(s.nickname),
      ...columns.map((a) => esc(valueOf.get(`${a.id}:${s.id}`) ?? "")),
    ].join(","),
  );

  // BOM을 붙여야 엑셀이 한글을 제대로 연다
  const csv = "﻿" + [header, ...rows].join("\r\n");

  const scopeName = subjectId
    ? (subjectName.get(subjectId) ?? "과목")
    : "전체";
  const filename = `성적_${classroom.name}_${scopeName}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
