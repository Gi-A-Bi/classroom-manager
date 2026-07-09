"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createEvent(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const endDateRaw = String(formData.get("end_date") ?? "").trim();
  const layer = String(formData.get("layer") ?? "");
  const month = String(formData.get("month") ?? "");

  const base = `/dashboard/classrooms/${classroomId}/calendar?month=${month}`;

  if (!title || !DATE_RE.test(eventDate)) {
    redirect(base + "&error=" + encodeURIComponent("제목과 날짜를 입력해주세요."));
  }
  if (endDateRaw && (!DATE_RE.test(endDateRaw) || endDateRaw < eventDate)) {
    redirect(base + "&error=" + encodeURIComponent("종료일은 시작일보다 뒤여야 합니다."));
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
    end_date: endDateRaw || null,
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

// 학사일정 붙여넣기 일괄 등록 — 미리보기에서 확정한 행들을 학교 레이어로 저장
export async function bulkCreateEvents(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const month = String(formData.get("month") ?? "");
  const payload = String(formData.get("payload") ?? "");

  const base = `/dashboard/classrooms/${classroomId}/calendar?month=${month}`;

  let rows: { title: string; start: string; end: string | null }[];
  try {
    rows = JSON.parse(payload);
  } catch {
    redirect(base + "&error=" + encodeURIComponent("등록할 일정이 없습니다."));
  }

  const valid = rows!
    .filter(
      (r) =>
        typeof r.title === "string" &&
        r.title.trim().length > 0 &&
        typeof r.start === "string" &&
        DATE_RE.test(r.start) &&
        (r.end === null || (typeof r.end === "string" && DATE_RE.test(r.end))),
    )
    .map((r) => ({
      classroom_id: classroomId,
      layer: "school" as const,
      title: r.title.trim().slice(0, 100),
      event_date: r.start,
      end_date: r.end && r.end > r.start ? r.end : null,
    }))
    .slice(0, 200);

  if (valid.length === 0) {
    redirect(base + "&error=" + encodeURIComponent("등록할 수 있는 일정이 없습니다. 날짜를 확인해주세요."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("events").insert(valid);

  if (error) {
    redirect(base + "&error=" + encodeURIComponent("일괄 등록에 실패했습니다."));
  }

  revalidatePath(`/dashboard/classrooms/${classroomId}/calendar`);
  redirect(base + "&success=" + encodeURIComponent(`학사일정 ${valid.length}건을 등록했습니다.`));
}

// --- 학부모용 공유 링크 ---

async function updateShareToken(classroomId: string, token: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return supabase
    .from("classrooms")
    .update({ share_token: token })
    .eq("id", classroomId);
}

export async function enableShare(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const month = String(formData.get("month") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/calendar?month=${month}`;

  // 추측 불가능한 128비트 토큰
  const token = randomBytes(16).toString("hex");
  const { error } = await updateShareToken(classroomId, token);

  if (error) {
    redirect(base + "&error=" + encodeURIComponent("공유 링크 생성에 실패했습니다."));
  }
  revalidatePath(`/dashboard/classrooms/${classroomId}/calendar`);
  redirect(base);
}

export async function disableShare(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const month = String(formData.get("month") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/calendar?month=${month}`;

  const { error } = await updateShareToken(classroomId, null);
  if (error) {
    redirect(base + "&error=" + encodeURIComponent("공유 끄기에 실패했습니다."));
  }
  revalidatePath(`/dashboard/classrooms/${classroomId}/calendar`);
  redirect(base);
}
