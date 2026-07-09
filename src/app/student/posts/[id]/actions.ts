"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-auth";
import { createStudentClient } from "@/lib/supabase/student";

// 준비물 체크 토글: 체크돼 있으면 해제, 없으면 기록.
// 학생 JWT 클라이언트 사용 — RLS가 본인(student_id 클레임) 행만 허용한다.
export async function toggleItemCheck(formData: FormData) {
  const itemId = String(formData.get("item_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");

  const session = await getStudentSession();
  if (!session) redirect("/student/login");

  const supabase = createStudentClient(session.token);

  const { data: existing } = await supabase
    .from("item_checks")
    .select("id")
    .eq("item_id", itemId)
    .eq("student_id", session.studentId)
    .maybeSingle();

  if (existing) {
    await supabase.from("item_checks").delete().eq("id", existing.id);
  } else {
    await supabase.from("item_checks").insert({
      item_id: itemId,
      student_id: session.studentId,
      classroom_id: session.classroomId,
    });
  }

  revalidatePath(`/student/posts/${postId}`);
}
