"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseItems(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);
}

// datetime-local("2026-08-25T08:00")을 KST 기준 timestamptz(ISO)로.
// 서버 타임존(Vercel=UTC)에 상관없이 교사가 고른 한국 시각으로 저장된다.
function kstLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(local + ":00+09:00");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// 게시 시각 결정: 예약이면 미래 시각(KST) 필요, 아니면 즉시(now)
function resolvePublishAt(
  mode: string,
  local: string,
): { publishAt: string; error?: string } {
  if (mode === "schedule") {
    const iso = kstLocalToIso(local);
    if (!iso) return { publishAt: "", error: "예약 시각을 올바르게 입력해주세요." };
    if (new Date(iso).getTime() <= Date.now()) {
      return { publishAt: "", error: "예약 시각은 미래여야 해요." };
    }
    return { publishAt: iso };
  }
  return { publishAt: new Date().toISOString() };
}

export async function createPost(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const postDate = String(formData.get("post_date") ?? "");
  const publishMode = String(formData.get("publish_mode") ?? "now");
  const scheduleLocal = String(formData.get("publish_local") ?? "");

  const base = `/dashboard/classrooms/${classroomId}/posts`;

  if (!title || !content) {
    redirect(base + "?error=" + encodeURIComponent("제목과 내용을 입력해주세요."));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postDate)) {
    redirect(base + "?error=" + encodeURIComponent("날짜를 선택해주세요."));
  }

  const { publishAt, error: schedErr } = resolvePublishAt(publishMode, scheduleLocal);
  if (schedErr) redirect(base + "?error=" + encodeURIComponent(schedErr));

  const itemLabels = parseItems(String(formData.get("items") ?? ""));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post, error } = await supabase
    .from("posts")
    .insert({ classroom_id: classroomId, title, content, post_date: postDate, publish_at: publishAt })
    .select("id")
    .single();

  if (error || !post) {
    redirect(base + "?error=" + encodeURIComponent("알림장 저장에 실패했습니다."));
  }

  if (itemLabels.length > 0) {
    const { error: itemError } = await supabase.from("post_items").insert(
      itemLabels.map((label, i) => ({
        post_id: post!.id,
        classroom_id: classroomId,
        label,
        position: i,
      })),
    );
    if (itemError) {
      redirect(base + "?error=" + encodeURIComponent("알림장은 저장됐지만 준비물 등록에 실패했습니다."));
    }
  }

  revalidatePath(base);
  const msg =
    publishMode === "schedule"
      ? "알림장을 예약했습니다. 지정 시각에 학생에게 공개돼요."
      : "알림장을 등록했습니다.";
  redirect(base + "?success=" + encodeURIComponent(msg));
}

export async function updatePost(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const postDate = String(formData.get("post_date") ?? "");
  const publishMode = String(formData.get("publish_mode") ?? "now");
  const scheduleLocal = String(formData.get("publish_local") ?? "");

  const base = `/dashboard/classrooms/${classroomId}/posts`;

  if (!title || !content || !/^\d{4}-\d{2}-\d{2}$/.test(postDate)) {
    redirect(base + `?edit=${postId}&error=` + encodeURIComponent("제목·내용·날짜를 확인해주세요."));
  }
  const { publishAt, error: schedErr } = resolvePublishAt(publishMode, scheduleLocal);
  if (schedErr) redirect(base + `?edit=${postId}&error=` + encodeURIComponent(schedErr));

  const itemLabels = parseItems(String(formData.get("items") ?? ""));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("posts")
    .update({ title, content, post_date: postDate, publish_at: publishAt })
    .eq("id", postId)
    .eq("classroom_id", classroomId);
  if (error) {
    redirect(base + `?edit=${postId}&error=` + encodeURIComponent("수정에 실패했습니다."));
  }

  // 준비물은 통째로 교체
  await supabase.from("post_items").delete().eq("post_id", postId);
  if (itemLabels.length > 0) {
    await supabase.from("post_items").insert(
      itemLabels.map((label, i) => ({
        post_id: postId,
        classroom_id: classroomId,
        label,
        position: i,
      })),
    );
  }

  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent("알림장을 수정했습니다."));
}

export async function deletePost(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/posts`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("posts").delete().eq("id", postId).eq("classroom_id", classroomId);
  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent("알림장을 삭제했습니다."));
}

// --- 템플릿 (교사 소유, 모든 학급 재사용) ---

export async function saveTemplate(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? ""));
  const base = `/dashboard/classrooms/${classroomId}/posts`;

  if (!title) {
    redirect(base + "?error=" + encodeURIComponent("템플릿으로 저장하려면 제목이 필요해요."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("post_templates")
    .insert({ teacher_id: user.id, title, content, items });
  if (error) {
    redirect(base + "?error=" + encodeURIComponent("템플릿 저장에 실패했습니다."));
  }

  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent(`"${title}" 템플릿을 저장했습니다.`));
}

export async function deleteTemplate(formData: FormData) {
  const classroomId = String(formData.get("classroom_id") ?? "");
  const templateId = String(formData.get("template_id") ?? "");
  const base = `/dashboard/classrooms/${classroomId}/posts`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("post_templates").delete().eq("id", templateId);
  revalidatePath(base);
  redirect(base + "?success=" + encodeURIComponent("템플릿을 삭제했습니다."));
}
