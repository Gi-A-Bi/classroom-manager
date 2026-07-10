"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["상담", "관찰", "칭찬", "기타"];

export async function addRecord(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const recordDate = String(formData.get("record_date") ?? "");
  const category = String(formData.get("category") ?? "기타");
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  const back = String(formData.get("back") ?? `/dashboard/classrooms/${classroomId}/records`);

  if (!studentId || !content || !/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
    redirect(back + (back.includes("?") ? "&" : "?") + "error=" + encodeURIComponent("학생, 날짜, 내용을 입력해주세요."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("student_records").insert({
    classroom_id: classroomId,
    student_id: studentId,
    record_date: recordDate,
    category: CATEGORIES.includes(category) ? category : "기타",
    content,
  });

  if (error) {
    redirect(back + (back.includes("?") ? "&" : "?") + "error=" + encodeURIComponent("기록 저장에 실패했습니다."));
  }

  revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
  redirect(back);
}

export async function deleteRecord(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const back = String(formData.get("back") ?? `/dashboard/classrooms/${classroomId}/records`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("student_records").delete().eq("id", recordId);
  revalidatePath(`/dashboard/classrooms/${classroomId}/records`);
  redirect(back);
}
