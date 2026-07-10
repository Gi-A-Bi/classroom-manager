"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

// --- 과목 관리 ---

export async function addSubject(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 30);
  const base = `/dashboard/classrooms/${classroomId}/grades`;

  if (!name) redirect(base + "?error=" + encodeURIComponent("과목 이름을 입력해주세요."));

  const supabase = await requireUser();
  const { count } = await supabase
    .from("subjects")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", classroomId);

  const { error } = await supabase.from("subjects").insert({
    classroom_id: classroomId,
    name,
    position: count ?? 0,
  });

  if (error) {
    const message =
      error.code === "23505" ? "이미 있는 과목이에요." : "과목 추가에 실패했습니다.";
    redirect(base + "?error=" + encodeURIComponent(message));
  }
  revalidatePath(base);
  redirect(base);
}

export async function renameSubject(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 30);
  const base = `/dashboard/classrooms/${classroomId}/grades`;

  if (!name) redirect(base + "?error=" + encodeURIComponent("과목 이름을 입력해주세요."));

  const supabase = await requireUser();
  const { error } = await supabase
    .from("subjects")
    .update({ name })
    .eq("id", subjectId);

  if (error) {
    redirect(base + "?error=" + encodeURIComponent("이름 변경에 실패했습니다."));
  }
  revalidatePath(base);
  redirect(base + `?subject=${subjectId}`);
}

export async function deleteSubject(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/grades`;

  const supabase = await requireUser();
  await supabase.from("subjects").delete().eq("id", subjectId);
  revalidatePath(base);
  redirect(base);
}

// --- 평가 관리 ---

export async function addAssessment(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const assessDate = String(formData.get("assess_date") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const maxScoreRaw = String(formData.get("max_score") ?? "").trim();
  const levelsRaw = String(formData.get("levels") ?? "").trim();
  const base = `/dashboard/classrooms/${classroomId}/grades?subject=${subjectId}`;

  if (!subjectId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(assessDate)) {
    redirect(base + "&error=" + encodeURIComponent("과목, 이름, 날짜를 입력해주세요."));
  }
  if (!["score", "level", "text"].includes(kind)) {
    redirect(base + "&error=" + encodeURIComponent("평가 유형을 선택해주세요."));
  }

  let maxScore: number | null = null;
  if (kind === "score" && maxScoreRaw) {
    maxScore = Number(maxScoreRaw);
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 10000) {
      redirect(base + "&error=" + encodeURIComponent("만점은 1 이상의 숫자여야 합니다."));
    }
  }

  let levels: string[] | null = null;
  if (kind === "level") {
    levels = [
      ...new Set(
        levelsRaw
          .split(",")
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && l.length <= 20),
      ),
    ].slice(0, 8);
    if (levels.length < 2) {
      redirect(base + "&error=" + encodeURIComponent("단계는 쉼표로 구분해 2개 이상 입력해주세요."));
    }
  }

  const supabase = await requireUser();
  const { data: created, error } = await supabase
    .from("assessments")
    .insert({
      classroom_id: classroomId,
      subject_id: subjectId,
      title,
      assess_date: assessDate,
      kind,
      max_score: maxScore,
      levels,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(base + "&error=" + encodeURIComponent("평가 만들기에 실패했습니다."));
  }
  revalidatePath(`/dashboard/classrooms/${classroomId}/grades`);
  redirect(`/dashboard/classrooms/${classroomId}/grades/${created!.id}`);
}

export async function deleteAssessment(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");

  const supabase = await requireUser();
  await supabase.from("assessments").delete().eq("id", assessmentId);
  revalidatePath(`/dashboard/classrooms/${classroomId}/grades`);
  redirect(`/dashboard/classrooms/${classroomId}/grades?subject=${subjectId}`);
}

// --- 결과 저장 (그리드에서 프로그램 호출, 즉시 저장) ---

type SaveOutcome = { ok: boolean; error?: string };

function validateValue(
  kind: string,
  maxScore: number | null,
  levels: string[] | null,
  value: string,
): string | null {
  if (kind === "score") {
    const n = Number(value);
    if (!Number.isFinite(n)) return "숫자만 입력할 수 있어요.";
    if (n < 0) return "0 이상이어야 해요.";
    if (maxScore !== null && n > maxScore) return `만점(${maxScore})을 넘을 수 없어요.`;
  }
  if (kind === "level" && levels && !levels.includes(value)) {
    return "단계 목록에 없는 값이에요.";
  }
  if (kind === "text" && value.length > 200) {
    return "200자 이내로 입력해주세요.";
  }
  return null;
}

export async function saveResults(input: {
  assessmentId: string;
  entries: { studentId: string; value: string }[];
}): Promise<SaveOutcome> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // RLS로 본인 학급 평가만 조회됨 — 남의 평가면 여기서 끝
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, classroom_id, kind, max_score, levels")
    .eq("id", input.assessmentId)
    .maybeSingle();
  if (!assessment) return { ok: false, error: "평가를 찾을 수 없습니다." };

  const entries = input.entries.slice(0, 100);
  const toUpsert: {
    assessment_id: string;
    student_id: string;
    classroom_id: string;
    value: string;
  }[] = [];
  const toDelete: string[] = [];

  for (const e of entries) {
    const value = e.value.trim();
    if (!value) {
      toDelete.push(e.studentId);
      continue;
    }
    const invalid = validateValue(
      assessment.kind,
      assessment.max_score,
      assessment.levels,
      value,
    );
    if (invalid) return { ok: false, error: invalid };
    toUpsert.push({
      assessment_id: assessment.id,
      student_id: e.studentId,
      classroom_id: assessment.classroom_id,
      value,
    });
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("assessment_results")
      .upsert(toUpsert, { onConflict: "assessment_id,student_id" });
    if (error) return { ok: false, error: "저장에 실패했습니다." };
  }
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("assessment_results")
      .delete()
      .eq("assessment_id", assessment.id)
      .in("student_id", toDelete);
    if (error) return { ok: false, error: "삭제에 실패했습니다." };
  }

  revalidatePath(`/dashboard/classrooms/${assessment.classroom_id}/grades/${assessment.id}`);
  return { ok: true };
}
