"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const layer = String(formData.get("layer") ?? "");
  const month = String(formData.get("month") ?? "");

  const base = `/dashboard/classrooms/${classroomId}/calendar?month=${month}`;

  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    redirect(base + "&error=" + encodeURIComponent("제목과 날짜를 입력해주세요."));
  }
  if (layer !== "school" && layer !== "classroom") {
    redirect(base + "&error=" + encodeURIComponent("일정 구분을 선택해주세요."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("events").insert({
    classroom_id: classroomId,
    title,
    event_date: eventDate,
    layer,
  });

  if (error) {
    redirect(base + "&error=" + encodeURIComponent("일정 등록에 실패했습니다."));
  }

  revalidatePath(`/dashboard/classrooms/${classroomId}/calendar`);
  redirect(base);
}

export async function deleteEvent(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const month = String(formData.get("month") ?? "");

  const base = `/dashboard/classrooms/${classroomId}/calendar?month=${month}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) {
    redirect(base + "&error=" + encodeURIComponent("일정 삭제에 실패했습니다."));
  }

  revalidatePath(`/dashboard/classrooms/${classroomId}/calendar`);
  redirect(base);
}
