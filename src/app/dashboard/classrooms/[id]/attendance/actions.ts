"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REASONS: Record<string, string[]> = {
  absent: ["병결", "체험학습", "출석인정", "미인정", "기타"],
  late: ["질병", "인정", "미인정"],
  early: ["질병", "인정", "미인정"],
  result: ["질병", "인정", "미인정"],
};

// 예외 상태 한 건 저장/수정/삭제 (출석으로 되돌리면 삭제).
// 클라이언트 그리드에서 셀 변경 즉시 호출.
export async function setAttendance(input: {
  classroomId: string;
  studentId: string;
  date: string;
  type: "present" | "absent" | "late" | "early" | "result";
  reason?: string;
  memo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!DATE_RE.test(input.date)) return { ok: false, error: "날짜가 올바르지 않습니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 담임 검증은 RLS가 하지만, 학급 소유를 먼저 확인해 애매한 실패를 줄인다
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", input.studentId)
    .eq("classroom_id", input.classroomId)
    .maybeSingle();
  if (!student) return { ok: false, error: "학생을 찾을 수 없습니다." };

  if (input.type === "present") {
    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("student_id", input.studentId)
      .eq("record_date", input.date);
    if (error) return { ok: false, error: "저장에 실패했습니다." };
    revalidatePath(`/dashboard/classrooms/${input.classroomId}/attendance`);
    return { ok: true };
  }

  const allowed = REASONS[input.type] ?? [];
  const reason = input.reason && allowed.includes(input.reason) ? input.reason : allowed[0];

  const { error } = await supabase.from("attendance_records").upsert(
    {
      classroom_id: input.classroomId,
      student_id: input.studentId,
      record_date: input.date,
      type: input.type,
      reason,
      memo: (input.memo ?? "").slice(0, 200),
    },
    { onConflict: "student_id,record_date" },
  );
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath(`/dashboard/classrooms/${input.classroomId}/attendance`);
  return { ok: true };
}
