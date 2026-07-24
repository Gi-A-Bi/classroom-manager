"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BUILTIN_KEYS, typeLabel } from "@/lib/record-types";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#+/, "").trim())
        .filter((t) => t.length > 0 && t.length <= 20),
    ),
  ].slice(0, 10);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// --- 빠른 기록 (팝업에서 호출, 값 반환) ---
export async function addQuickRecord(input: {
  classroomId: string;
  studentId: string;
  recordType: string;
  detail?: string | null;
  memo?: string | null;
  tags?: string[];
  date?: string | null;
  peerStudentId?: string | null;
}): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireUser();

  const classroomId = input.classroomId;
  const studentId = input.studentId;
  const recordType = input.recordType;
  if (!classroomId || !studentId || !recordType) {
    return { ok: false, message: "학생과 유형을 선택해주세요." };
  }
  // 커스텀 유형이 아니면 내장 키만 허용
  if (recordType !== "custom" && !BUILTIN_KEYS.includes(recordType)) {
    return { ok: false, message: "알 수 없는 유형입니다." };
  }

  const record_date =
    input.date && DATE_RE.test(input.date)
      ? input.date
      : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST 오늘
  const detail = (input.detail ?? "").trim().slice(0, 40) || null;
  const content = (input.memo ?? "").trim().slice(0, 2000) || null;
  const tags = (input.tags ?? []).map((t) => t.replace(/^#+/, "").trim()).filter(Boolean).slice(0, 10);

  // 학생이 이 학급 소속인지 확인 (RLS도 강제하지만 조기 검증)
  const { data: stu } = await supabase
    .from("students")
    .select("id, number, nickname")
    .eq("id", studentId)
    .eq("classroom_id", classroomId)
    .maybeSingle();
  if (!stu) return { ok: false, message: "학생을 찾을 수 없습니다." };

  const label = typeLabel(recordType, detail);

  // 갈등: 상대 학생이 있으면 양쪽에 상호 연결로 저장
  if (recordType === "conflict" && input.peerStudentId) {
    const { data: peer } = await supabase
      .from("students")
      .select("id, number, nickname")
      .eq("id", input.peerStudentId)
      .eq("classroom_id", classroomId)
      .maybeSingle();
    if (!peer) return { ok: false, message: "상대 학생을 찾을 수 없습니다." };

    const link = randomUUID();
    const base = { classroom_id: classroomId, record_date, record_type: recordType, detail, content, tags, link_group: link };
    const { error } = await supabase.from("student_records").insert([
      { ...base, student_id: stu.id, peer_student_id: peer.id },
      { ...base, student_id: peer.id, peer_student_id: stu.id },
    ]);
    if (error) return { ok: false, message: "저장에 실패했습니다." };

    revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
    revalidatePath(`/dashboard/classrooms/${classroomId}/students`);
    return { ok: true, message: `${stu.number} ↔ ${peer.number} 갈등 기록 저장됨` };
  }

  const { error } = await supabase.from("student_records").insert({
    classroom_id: classroomId,
    student_id: stu.id,
    record_date,
    record_type: recordType,
    detail,
    content,
    tags,
  });
  if (error) return { ok: false, message: "저장에 실패했습니다." };

  revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
  revalidatePath(`/dashboard/classrooms/${classroomId}/students`);
  return { ok: true, message: `${stu.number}번 ${stu.nickname} · ${label} 저장됨` };
}

// --- 기록 화면 수동 추가 (긴 메모용) ---
export async function addRecord(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const recordDate = String(formData.get("record_date") ?? "");
  const recordType = String(formData.get("record_type") ?? "observation");
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const back = String(formData.get("back") ?? `/dashboard/classrooms/${classroomId}/records`);
  const err = (m: string) =>
    back + (back.includes("?") ? "&" : "?") + "error=" + encodeURIComponent(m);

  if (!studentId || !DATE_RE.test(recordDate)) {
    redirect(err("학생과 날짜를 확인해주세요."));
  }
  if (recordType !== "custom" && !BUILTIN_KEYS.includes(recordType)) {
    redirect(err("유형을 선택해주세요."));
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("student_records").insert({
    classroom_id: classroomId,
    student_id: studentId,
    record_date: recordDate,
    record_type: recordType,
    content: content || null,
    tags,
  });
  if (error) redirect(err("기록 저장에 실패했습니다."));

  revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
  revalidatePath(`/dashboard/classrooms/${classroomId}/students`);
  redirect(back);
}

// --- 기록 수정 (내용·태그·날짜) ---
export async function updateRecord(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const recordDate = String(formData.get("record_date") ?? "");
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const back = String(
    formData.get("back") ?? `/dashboard/classrooms/${classroomId}/records`,
  );
  const err = (m: string) =>
    back + (back.includes("?") ? "&" : "?") + "error=" + encodeURIComponent(m);

  if (!recordId || !DATE_RE.test(recordDate)) {
    redirect(err("날짜를 확인해주세요."));
  }

  const { supabase } = await requireUser();
  const patch = { record_date: recordDate, content: content || null, tags };

  // 갈등 상호 기록이면 짝도 함께 수정 — 내용·태그·날짜를 양쪽 동일하게 유지
  const { data: rec } = await supabase
    .from("student_records")
    .select("id, link_group")
    .eq("id", recordId)
    .maybeSingle();
  if (!rec) redirect(err("기록을 찾을 수 없습니다."));

  const { error } = rec.link_group
    ? await supabase
        .from("student_records")
        .update(patch)
        .eq("link_group", rec.link_group)
    : await supabase.from("student_records").update(patch).eq("id", recordId);
  if (error) redirect(err("기록 수정에 실패했습니다."));

  revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
  revalidatePath(`/dashboard/classrooms/${classroomId}/students`);
  redirect(back);
}

export async function deleteRecord(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const back = String(formData.get("back") ?? `/dashboard/classrooms/${classroomId}/records`);

  const { supabase } = await requireUser();
  // 갈등 상호 기록이면 짝도 함께 지운다
  const { data: rec } = await supabase
    .from("student_records")
    .select("id, link_group")
    .eq("id", recordId)
    .maybeSingle();
  if (rec?.link_group) {
    await supabase.from("student_records").delete().eq("link_group", rec.link_group);
  } else {
    await supabase.from("student_records").delete().eq("id", recordId);
  }
  revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
  revalidatePath(`/dashboard/classrooms/${classroomId}/students`);
  redirect(back);
}

// --- 커스텀 유형 (교사 소유) ---
export async function addRecordType(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 20);
  const back = `/dashboard/classrooms/${classroomId}/records`;
  if (!label) redirect(back + "?error=" + encodeURIComponent("유형 이름을 입력해주세요."));

  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("record_types")
    .select("id", { count: "exact", head: true });
  await supabase
    .from("record_types")
    .insert({ teacher_id: user.id, label, sort_order: count ?? 0 });

  revalidatePath(back);
  redirect(back);
}

export async function deleteRecordType(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const typeId = String(formData.get("type_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("record_types").delete().eq("id", typeId);
  revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
  redirect(`/dashboard/classrooms/${classroomId}/records`);
}
